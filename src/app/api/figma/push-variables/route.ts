import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { verify } from 'jsonwebtoken';

// CORS headers for Figma plugin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' }, 
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: corsHeaders }
      );
    }

    let decoded: any;
    try {
      decoded = verify(token, jwtSecret);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' }, 
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { projectId, tokenSets, metadata } = body;

    if (!projectId || !tokenSets || !Array.isArray(tokenSets)) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, tokenSets' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createSupabaseServerClient();
    
    // Verify user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id, organizations!inner(owner_id)')
      .eq('id', projectId)
      .eq('organizations.owner_id', decoded.userId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' }, 
        { status: 404, headers: corsHeaders }
      );
    }

    // Process token sets and create/update tokens
    const results = {
      tokensCreated: 0,
      tokensUpdated: 0,
      setsCreated: 0,
      errors: [] as string[],
      changes: [] as any[]
    };

    for (const tokenSet of tokenSets) {
      try {
        // Check if set exists
        let { data: existingSet, error: setError } = await supabase
          .from('token_sets')
          .select('id, name')
          .eq('project_id', projectId)
          .eq('name', tokenSet.name)
          .single();

        let setId: string;

        if (!existingSet) {
          // Create new set
          const { data: newSet, error: createSetError } = await supabase
            .from('token_sets')
            .insert({
              project_id: projectId,
              name: tokenSet.name,
              description: `Imported from Figma collection: ${tokenSet.name}`,
              level: 1
            })
            .select('id')
            .single();

          if (createSetError || !newSet) {
            results.errors.push(`Failed to create set "${tokenSet.name}": ${createSetError?.message}`);
            continue;
          }

          setId = newSet.id;
          results.setsCreated++;
          
          // Record set creation change
          results.changes.push({
            type: 'set_created',
            set_name: tokenSet.name,
            timestamp: new Date().toISOString(),
            source: 'figma_import'
          });
        } else {
          setId = existingSet.id;
        }

        // Process tokens in the set
        for (const token of tokenSet.tokens) {
          try {
            // Validate token data
            const validationError = validateToken(token);
            if (validationError) {
              results.errors.push(`Token "${token.name}" in set "${tokenSet.name}": ${validationError}`);
              continue;
            }

            // Check if token exists
            const { data: existingToken, error: tokenError } = await supabase
              .from('tokens')
              .select('id, name, value, type, description')
              .eq('token_set_id', setId)
              .eq('name', token.name)
              .single();

            if (!existingToken) {
              // Create new token
              const { data: newToken, error: createTokenError } = await supabase
                .from('tokens')
                .insert({
                  project_id: projectId,
                  token_set_id: setId,
                  name: token.name,
                  type: token.type,
                  value: token.value,
                  description: token.description || '',
                  source: 'figma',
                  created_by: decoded.userId
                })
                .select('id')
                .single();

              if (createTokenError) {
                results.errors.push(`Failed to create token "${token.name}": ${createTokenError.message}`);
                continue;
              }

              results.tokensCreated++;
              
              // Record token creation change
              await recordChange(supabase, {
                project_id: projectId,
                token_id: newToken.id,
                change_type: 'created',
                after: { value: token.value, type: token.type },
                source: 'figma',
                created_by: decoded.userId
              });

              results.changes.push({
                type: 'token_created',
                token_name: token.name,
                original_name: token.originalName || token.name,
                set_name: tokenSet.name,
                value: token.value,
                token_type: token.type
              });

            } else if (existingToken.value !== token.value || existingToken.type !== token.type) {
              // Update existing token
              const { error: updateTokenError } = await supabase
                .from('tokens')
                .update({
                  value: token.value,
                  type: token.type,
                  description: token.description || existingToken.description,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingToken.id);

              if (updateTokenError) {
                results.errors.push(`Failed to update token "${token.name}": ${updateTokenError.message}`);
                continue;
              }

              results.tokensUpdated++;
              
              // Record token update change
              await recordChange(supabase, {
                project_id: projectId,
                token_id: existingToken.id,
                change_type: 'modified',
                before: { value: existingToken.value, type: existingToken.type },
                after: { value: token.value, type: token.type },
                source: 'figma',
                created_by: decoded.userId
              });

              results.changes.push({
                type: 'token_updated',
                token_name: token.name,
                set_name: tokenSet.name,
                old_value: existingToken.value,
                new_value: token.value,
                old_type: existingToken.type,
                new_type: token.type
              });
            }

          } catch (tokenError) {
            results.errors.push(`Error processing token "${token.name}": ${tokenError}`);
          }
        }

      } catch (setError) {
        results.errors.push(`Error processing set "${tokenSet.name}": ${setError}`);
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.tokensCreated + results.tokensUpdated} tokens`,
      results: {
        tokensCreated: results.tokensCreated,
        tokensUpdated: results.tokensUpdated,
        setsCreated: results.setsCreated,
        totalChanges: results.changes.length,
        errors: results.errors
      },
      changes: results.changes,
      projectUrl: `https://fragmento-theta.vercel.app/projects/${projectId}/tokens`
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Push variables API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

// Function to sanitize token names
function sanitizeTokenName(name: string): string {
  return name
    // Replace forward slashes with dots
    .replace(/\//g, '.')
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Replace multiple consecutive dots/underscores with single ones
    .replace(/[._]{2,}/g, '_')
    // Remove any characters that aren't letters, numbers, dots, underscores, or hyphens
    .replace(/[^a-zA-Z0-9._-]/g, '')
    // Remove leading/trailing dots, underscores, or hyphens
    .replace(/^[._-]+|[._-]+$/g, '')
    // Ensure it doesn't start with a number
    .replace(/^(\d)/, '_$1');
}

// Validation function for tokens
function validateToken(token: any): string | null {
  if (!token.name || typeof token.name !== 'string') {
    return 'Token name is required and must be a string';
  }

  if (!token.type || typeof token.type !== 'string') {
    return 'Token type is required and must be a string';
  }

  if (token.value === undefined || token.value === null) {
    return 'Token value is required';
  }

  // Auto-convert token name to valid format
  const originalName = token.name;
  const sanitizedName = sanitizeTokenName(token.name);
  
  // Check if name is empty after sanitization
  if (!sanitizedName || sanitizedName.length === 0) {
    return `Token name "${originalName}" could not be converted to a valid format`;
  }
  
  // Store original name if it was changed
  if (originalName !== sanitizedName) {
    token.originalName = originalName;
  }
  token.name = sanitizedName;

  // Type-specific validation
  switch (token.type) {
    case 'color':
      if (typeof token.value === 'string' && !token.value.startsWith('{')) {
        // Validate color format (hex, rgb, etc.)
        const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|oklch\()/;
        if (!colorRegex.test(token.value)) {
          return 'Invalid color format. Use hex, rgb, hsl, or oklch format';
        }
      }
      break;
      
    case 'spacing':
      if (typeof token.value === 'string' && !token.value.startsWith('{')) {
        // Validate spacing format (should have units)
        if (!/^\d+(\.\d+)?(px|rem|em|%)$/.test(token.value)) {
          return 'Invalid spacing format. Use values with units (px, rem, em, %)';
        }
      }
      break;
      
    case 'number':
      if (typeof token.value === 'string' && !token.value.startsWith('{')) {
        if (isNaN(Number(token.value))) {
          return 'Invalid number format';
        }
      }
      break;
  }

  return null;
}

// Function to record changes
async function recordChange(supabase: any, change: any) {
  try {
    const { error } = await supabase
      .from('changes')
      .insert({
        project_id: change.project_id,
        token_id: change.token_id,
        change_type: change.change_type,
        before: change.before || null,
        after: change.after || null,
        source: change.source,
        created_by: change.created_by,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error recording change:', error);
    }
  } catch (error) {
    console.error('Error in recordChange:', error);
  }
}
