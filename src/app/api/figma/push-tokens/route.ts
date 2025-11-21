import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import jwt from 'jsonwebtoken';

interface TokenSet {
  name: string;
  tokens: {
    name: string;
    type: string;
    value: string;
    description: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (decoded.type !== 'figma_plugin') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, tokenSets }: { projectId: string; tokenSets: TokenSet[] } = body;

    if (!projectId || !tokenSets || !Array.isArray(tokenSets)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    
    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id, organizations!inner(owner_id)')
      .eq('id', projectId)
      .single();

    if (projectError || !project || (project.organizations as any).owner_id !== decoded.userId) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const results = [];

    // Process each token set
    for (const tokenSet of tokenSets) {
      try {
        // Check if a set with this name already exists
        let { data: existingSet, error: setError } = await supabase
          .from('token_sets')
          .select('id')
          .eq('project_id', projectId)
          .eq('name', tokenSet.name)
          .single();

        let setId;

        if (setError && setError.code === 'PGRST116') {
          // Set doesn't exist, create it
          const { data: newSet, error: createSetError } = await supabase
            .from('token_sets')
            .insert({
              name: tokenSet.name,
              project_id: projectId,
              created_by: decoded.userId
            })
            .select('id')
            .single();

          if (createSetError) {
            console.error('Error creating token set:', createSetError);
            continue;
          }

          setId = newSet.id;
        } else if (existingSet) {
          setId = existingSet.id;
        } else {
          console.error('Error checking token set:', setError);
          continue;
        }

        // Process tokens in this set
        const tokenResults = [];
        
        for (const token of tokenSet.tokens) {
          try {
            // Check if token with this name exists in the set
            const { data: existingToken, error: tokenError } = await supabase
              .from('tokens')
              .select('id, value')
              .eq('set_id', setId)
              .eq('name', token.name)
              .single();

            if (tokenError && tokenError.code === 'PGRST116') {
              // Token doesn't exist, create it
              const { data: newToken, error: createTokenError } = await supabase
                .from('tokens')
                .insert({
                  name: token.name,
                  type: token.type,
                  value: token.value,
                  description: token.description,
                  set_id: setId,
                  created_by: decoded.userId
                })
                .select('id')
                .single();

              if (createTokenError) {
                console.error('Error creating token:', createTokenError);
                continue;
              }

              // Record this as a change
              await supabase
                .from('changes')
                .insert({
                  type: 'create',
                  entity_type: 'token',
                  entity_id: newToken.id,
                  project_id: projectId,
                  source: 'figma',
                  created_by: decoded.userId
                });

              tokenResults.push({ action: 'created', token: token.name });
              
            } else if (existingToken) {
              // Token exists, check if value is different
              if (existingToken.value !== token.value) {
                // Update the token
                const { error: updateError } = await supabase
                  .from('tokens')
                  .update({
                    value: token.value,
                    description: token.description,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingToken.id);

                if (updateError) {
                  console.error('Error updating token:', updateError);
                  continue;
                }

                // Record this as a change
                await supabase
                  .from('changes')
                  .insert({
                    type: 'update',
                    entity_type: 'token',
                    entity_id: existingToken.id,
                    project_id: projectId,
                    source: 'figma',
                    old_value: existingToken.value,
                    new_value: token.value,
                    created_by: decoded.userId
                  });

                tokenResults.push({ action: 'updated', token: token.name });
              } else {
                tokenResults.push({ action: 'unchanged', token: token.name });
              }
            }
          } catch (tokenErr) {
            console.error('Error processing token:', tokenErr);
            tokenResults.push({ action: 'error', token: token.name, error: 'Processing failed' });
          }
        }

        results.push({
          set: tokenSet.name,
          setId,
          tokens: tokenResults
        });

      } catch (setErr) {
        console.error('Error processing token set:', setErr);
        results.push({
          set: tokenSet.name,
          error: 'Processing failed'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tokens processed successfully',
      results
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
