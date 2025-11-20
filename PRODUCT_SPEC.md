Fragmento Product Specification
Version 1.0 | Design Token Management Platform
Summary
Fragmento is a design token management platform that bridges the gap between design (Figma) and development (GitHub). It enables teams to maintain a single source of truth for design tokens, with versioning, multi-platform export, and seamless collaboration workflows.
Core Value Proposition:
Centralized token management with referencing capabilities
Unidirectional sync from Figma to code repositories via web app
Version control and release management
shadcn/ui-optimized token export for seamless integration
Team collaboration with role-based access
Simplified Workflow Philosophy: Fragmento follows a unidirectional data flow to minimize conflicts:
Figma → Web App (via Plugin Push)
Web App → GitHub (via Release Creation)
This approach eliminates bidirectional sync conflicts while maintaining flexibility for both designers (working in Figma) and developers (creating tokens in the web app).

1. Web Application
1.1 Authentication & User Management
1.1.1 Sign Up Flow
Entry Point: /signup
Methods:
Google OAuth
Single-click "Continue with Google" button
Auto-verifies email via Google
Captures: Full name, email, profile picture
Email Registration
Form fields:
Full Name (required)
Email (required, validated format)
Password (required, min 8 chars, 1 uppercase, 1 number, 1 special char)
Confirm Password (required, must match)
On submit:
6-digit OTP sent to email (expires in 10 minutes)
Navigate to /verify-email
User enters OTP
Maximum 3 attempts before resending
Success State: Navigate to /onboarding/create-organization
1.1.2 Sign In Flow
Entry Point: /signin
Methods:
Google OAuth (same as signup)
Email/Password
Form fields: Email, Password
"Remember me" checkbox (30-day session)
"Forgot Password?" link
Success State: Navigate to last accessed project or /tokens
1.1.3 Password Reset Flow
Entry Point: /forgot-password (linked from sign-in page)
Steps:
User enters email
6-digit OTP sent to email
Navigate to /reset-password
User enters OTP (3 attempts, 10-min expiry)
User enters new password + confirm password
Success: Auto-login and navigate to /tokens
Security Measures:
Rate limiting: 5 attempts per hour per email
OTP codes are single-use
Passwords hashed using bcrypt (cost factor 12)
Session tokens: JWT with 24-hour expiry (refresh token: 30 days)
1.2 Onboarding Flow
1.2.1 Create Organization
Entry Point: /onboarding/create-organization (first-time users only)
Validation:
Organization name: 3-50 characters
Unique per user account
Success State: Navigate to /onboarding/select-plan
Backend:
Create organization record
Assign creator as owner role
Initialize default settings
1.2.2 Select Plan
Entry Point: /onboarding/select-plan
Plan Comparison:
Individual Plan (Free Forever):
Price: Free
Editor Seats: 1 user
Viewer Seats: Unlimited
Projects: 1 project
Token Sets: Unlimited
GitHub Integration: Included
Versioning & Releases: Included
Export Format: shadcn/ui
Slack Integration: Not available
Organization Plan ($49/month):
Price: $49 per month
Editor Seats: 5 included
Viewer Seats: Unlimited
Projects: 10 projects
Token Sets: Unlimited
GitHub Integration: Included
Versioning & Releases: Included
Export Format: shadcn/ui
Slack Integration: Included
Plan Selection Logic:
Individual: Immediate activation, no payment required, suitable for solo designers or small projects
Organization: 14-day free trial, then requires payment method, suitable for teams and multiple projects
Users can upgrade/downgrade anytime from Settings
Billing handled through Stripe integration
Success State: Navigate to /onboarding/create-project
1.2.3 Create First Project
Entry Point: /onboarding/create-project
Form Structure:
┌─────────────────────────────────────────────┐
│ Create Your First Project                   │
├─────────────────────────────────────────────┤
│                                             │
│ Project Name *                              │
│ [________________________________]          │
│                                             │
│ Description (optional)                      │
│ [________________________________]          │
│ [________________________________]          │
│                                             │
│ Examples: Brand Tokens, Mobile App DS       │
│                                             │
│ [Create Project]                            │
└─────────────────────────────────────────────┘
Form Components:
Project Name Input: Text input field with real-time validation, shows character count (3-50 characters), displays error message if name already exists in organization
Description Textarea: Multi-line text input (optional), supports up to 500 characters, provides helpful placeholder text
Examples Section: Shows common project name patterns to guide users
Create Button: Primary action button, disabled until name validation passes, shows loading state during creation
Validation:
Project name: 3-50 characters, must be unique within organization, no special characters except hyphens and underscores
Description: Optional, max 500 characters
Auto-Generated Defaults: When project is created, automatically generate:
Three default token sets:
global (level 0) - Contains primitive values only, cannot reference other sets, stores raw color values, spacing units, typography scales
semantic (level 1) - Can reference global set tokens, contains brand-specific tokens like primary-color, error-color, success-color, warning-color
component (level 2) - Can reference both semantic and global sets, contains component-specific tokens like button-background, card-border, input-focus-ring
Sample tokens in global set:
Colors (shadcn/ui compatible):
- slate-50: #f8fafc
- slate-100: #f1f5f9
- slate-200: #e2e8f0
- slate-500: #64748b
- slate-900: #0f172a
- blue-500: #3b82f6
- blue-600: #2563eb
- red-500: #ef4444
Spacing (Tailwind-compatible):
- spacing-1: 0.25rem (4px)
- spacing-2: 0.5rem (8px)
- spacing-4: 1rem (16px)
- spacing-6: 1.5rem (24px)
- spacing-8: 2rem (32px)
Border Radius (shadcn/ui standard):
- radius-sm: 0.125rem (2px)
- radius-md: 0.375rem (6px)
- radius-lg: 0.5rem (8px)
- radius-full: 9999px
Success State: Navigate to /projects/{project-id}/tokens/set/global

1.3 Main Dashboard
1.3.1 Layout Structure
Navigation Hierarchy:
Top Bar Components:
Logo with Project Switcher Dropdown: Shows current project name with organization context, dropdown lists all accessible projects grouped by organization, displays project access level badges (View Only/Can Edit), includes quick search within dropdown for projects
Search Tokens: Center-right positioned search bar, global token search across current project, shows real-time results with token preview, supports filtering by type and set
Notifications Bell: Icon with badge showing unread count, dropdown shows recent activity (releases, pushes from Figma, team member actions), marks as read on click
User Profile Menu: Avatar with dropdown, shows user name and email, links to account settings, organization settings, billing (for owners), sign out option
Sidebar Navigation Structure:
Collapsible Sidebar: Can be minimized to icon-only view, width: 240px expanded, 64px collapsed
Navigation Items:
🎨 Tokens & Sets - Main token management interface, shows active state with highlight. Token set configuration and hierarchy management
🔄 Versions & Releases - View pending changes and release history
🔧 Export Configuration - Configure shadcn/ui export settings
🔗 Integrations - GitHub and Slack integration management
⚙️ Project Settings - Team members, access control, danger zone
Sidebar Footer:
Trial/Plan status indicator for current organization
Upgrade/billing button (if applicable)
Current user avatar and name

1.4 Token Management
1.4.1 Sets Architecture
Concept: Sets are hierarchical containers for tokens that enable token referencing (aliasing). The hierarchy determines which tokens can reference other tokens, preventing circular dependencies while maintaining a logical structure that maps to shadcn/ui's theming approach.
Default Set Structure:
Global Set (Level 0):
Purpose: Contains primitive values that serve as the foundation for all other tokens
Cannot Reference: Any other sets
Contains: Raw color values (slate-50 through slate-900), base spacing units (0.25rem, 0.5rem, 1rem), typography primitives (font families, base font sizes), border radius values, shadow definitions
Usage Pattern: These are the "atoms" of your design system, typically mapping to Tailwind's default scale
Example Tokens: global.slate-500, global.spacing-4, global.radius-md
Semantic Set (Level 1):
Purpose: Contains brand and context-specific tokens that reference global primitives
Can Reference: global set only
Contains: Brand colors (primary, secondary, accent), contextual colors (destructive, success, warning, muted), background variants (background, foreground, card, popover), border colors (border, input, ring)
Usage Pattern: Maps to shadcn/ui's CSS variable structure, defines your brand's color scheme
Example Tokens: semantic.primary → {global.blue-500}, semantic.destructive → {global.red-500}
Component Set (Level 2):
Purpose: Contains component-specific tokens for UI elements
Can Reference: Both semantic and global sets
Contains: Component backgrounds (button-primary-bg, card-bg, dialog-bg), component foregrounds (button-primary-fg, card-fg), interactive states (button-hover, button-active, input-focus), component-specific spacing and sizing
Usage Pattern: Direct mapping to shadcn/ui component styles, allows per-component customization
Example Tokens: component.button-primary-bg → {semantic.primary}, component.card-border → {semantic.border}
Sets List View Components:
Title: "Token Sets" with count badge showing total number of sets
Primary action: "+ New Set" button (disabled for free plan if limit reached)
Secondary actions: Sort dropdown (by level, by name, by token count), filter input for set names
Interactive: click any set to navigate to its tokens
Creating New Set:
Form Modal Components:
Set Name Input: Required field, validates uniqueness, suggests naming conventions (lowercase, hyphen-separated)
Description Textarea: Optional, helps document the set's purpose
Set Rules Enforced:
Set names must be unique within a project (case-insensitive)
Sets at level 0 cannot reference any other sets (enforced at database level)
Sets can only reference sets at lower levels (parent → child direction only)
Circular references are prevented by hierarchy validation
Deleting a set requires removing all references to it first (or cascade delete tokens)
1.4.2 Token Management UI
Tokens List View: /projects/{project-id}/tokens
Page Layout Components:
Top Action Bar:
Breadcrumb navigation showing: Dashboard → Project Name → Current Set → Tokens
View mode (table view)
"New Token" button (primary action, opens creation modal)
Side Bar:
Set selector (quick switch between global/semantic/component)
Filter and Search Section:
Global Search Input: Searches across token names, values, and descriptions, shows real-time results with highlighting, supports advanced syntax (type:color, set:global, source:figma)
Filter Chips: Active filters displayed as removable chips
Filter Dropdown: Filter by token type (color, spacing, typography, etc.), filter by source (web app, figma, auto-generated), filter by set, filter by usage (used vs unused tokens)
Sort Dropdown: Sort by name (A-Z, Z-A), sort by recently modified, sort by creation date, sort by type
Token Table Structure:
Table Header:
Checkbox column for bulk selection (select all visible)
Row number column (shows position in current sort)
Name column (sortable, shows hierarchical structure with indentation)
Value column (shows formatted value with type-specific rendering)
Resolved Value column (shows computed value after resolving references)
Type column (shows icon and label)
Source column (shows origin: Web App 🌐, Figma 🎨, Auto-generated 📦)
Actions column (three-dot menu for row actions)
Token Row Components:
Standard Token Row:
Checkbox: For bulk selection
Row Number: Sequential number in current view
Name Cell: Token name in monospace font (e.g., color.red.500), shows full path with parent hierarchy, syntax highlighting for references
Value Cell:
For colors: Color swatch (16x16px) followed by value
For spacing: Ruler icon followed by value
For typography: Font icon followed by value
For references: Arrow icon (→) followed by reference target
Resolved Value Cell: Final computed value shown in lighter text, if same as value shows "—", tooltip shows resolution chain for nested references
Type Badge: Colored badge showing token type (color, spacing, font-size, etc.)
Actions Menu: Three-dot icon opening dropdown with: Edit token, Duplicate token, View usage, Copy name, Copy value, Delete token
Token Row Interactions:
Click Behaviors:
Single Click: Selects the row (highlights with border and background tint)
Double Click on Name: Opens inline edit mode for name
Click on Color Swatch: Opens color picker modal for quick edit
Click on Value Cell: Opens inline edit mode for value
Hover: Shows additional metadata overlay
Hover State Overlay: Appears as floating card near cursor showing:
Full token path (if truncated)
Complete description (if available)
Source: "Created in Web App" or "Pushed from Figma" or "Auto-generated"
Created date and user
Last modified date and user
Used by: List of tokens that reference this token (first 5, expandable)
Used in: List of components/files using this token (if tracked)
Empty States:
No Tokens in Set:
Empty state illustration (icon or image)
"No tokens in this set yet"
"Create your first token to get started"
[Create Token] button
No Search Results:
Search icon illustration
"No tokens found for 'your-search-query'"
Suggestions:
- Check your spelling
- Try different keywords
- Remove some filters
[Clear Search] button
Bulk Actions Bar:
Appears at bottom of screen when tokens are selected:
"N tokens selected" count display
Bulk actions dropdown: Change set, Change type (if compatible), Add prefix, Add suffix, Delete selected
Clear selection button
Close button to dismiss
1.4.3 Create/Edit Token Dialog
Create Token: Click "+ New Token" button
Modal Structure:
Modal Header:
Title: "Create new token" (or "Edit token: token.name" for edits)
Close button (X icon) on far right
Form Layout 
Primary Information:
Name Input Field:
Label: "Token Name *" with required indicator
Input: Text field with monospace font
Validation: Real-time validation with inline error messages
Valid characters: lowercase letters, numbers, hyphens, periods (dots)
Auto-suggestion dropdown appears as user types, suggesting:
Similar existing token patterns
Common naming conventions (color., spacing., typography.)
Recently created tokens in same set
Shows character count and uniqueness indicator (green checkmark when unique)
Type Selector:
Label: "Type *" with required indicator
Dropdown with categorized options:
Colors: Color, Color (HSL), Color (OKLCH)
Spacing: Spacing, Padding, Margin, Gap
Typography: Font Family, Font Size, Font Weight, Line Height, Letter Spacing
Effects: Box Shadow, Text Shadow, Border, Border Radius
Other: Number, String, Opacity
Changing type updates value input field to match (e.g., color picker for colors)
Value Input Field (Dynamic):
Label: "Value *" with required indicator
Input type changes based on selected token type:
For Color Type:
Color picker button (shows current color)
Text input supporting multiple formats:
Hex: #3B82F6
RGB: rgb(59, 130, 246)
HSL: hsl(217, 92%, 60%)
OKLCH: oklch(0.636 0.155 248.45)
Format switcher buttons (HEX | RGB | HSL | OKLCH)
Reference input: Type { to trigger token reference autocomplete
Shows dropdown with available tokens from referenceable sets
Filters by color type tokens only
Shows token preview (color swatch + name)
Format: {set-name.token-name}
For Spacing/Dimension Type:
Number input with unit selector dropdown
Supported units: px, rem, em, %, vw, vh
Reference input: Type { for autocomplete
Visual ruler showing approximate size (for px/rem)
For Typography Type:
Depends on specific subtype:
Font Family: Dropdown with system fonts + custom font input
Font Size: Number + unit (px, rem, em)
Font Weight: Dropdown (100-900) or keywords (normal, bold, etc.)
Line Height: Number (unitless multiplier) or value + unit
For Shadow Type:
Multi-part input showing: X-offset, Y-offset, Blur, Spread, Color
Each part editable separately
Color part supports all color formats and references
Preview shadow rendered in real-time below input
Description Textarea:
Label: "Description (optional)"
Multi-line text input (3-4 rows)
Placeholder: "Add a description to help your team understand this token..."
Character limit: 500 characters with counter
Modal Footer:
Action Buttons:
Cancel: Secondary button, closes modal without saving, shows confirmation if unsaved changes
Save: Primary button, validates all fields before saving, shows loading state during save, displays success notification on completion
Validation and Error Handling:
Real-time Validation:
Name uniqueness checked as user types (with debounce)
Value format validated based on type
Reference validity checked (target exists, no circular refs)
Visual indicators: Green checkmark for valid, Red X for invalid
Error States:
Inline error messages below each field
Prevents save until all errors resolved
Helpful error messages with suggestions:
"Token name 'primary-color' already exists. Try: primary-color-alt"
"Circular reference detected: A → B → A"
"Referenced token 'global.blue-800' not found. Did you mean 'global.blue-500'?"
Token Types & Validation:
Color Type - Detailed:
Input Formats Supported: Hexadecimal (#RGB, #RRGGBB, #RRGGBBAA), RGB/RGBA (rgb(r, g, b), rgba(r, g, b, a)), HSL/HSLA (hsl(h, s%, l%), hsla(h, s%, l%, a)), OKLCH (oklch(L C H) - modern color space)
Validation Rules: Must be valid color syntax, Alpha values 0-1 or 0-100%, Hue values 0-360 degrees
Example Values: #3B82F6, rgb(59, 130, 246), oklch(0.636 0.155 248.45)
Special Features: Color picker with swatches, format converter, contrast ratio checker (WCAG AA/AAA)
Font Family Type:
Input Format: String or comma-separated list for font stack
Validation: Non-empty string
Example Values: "Inter", sans-serif, "Geist Mono", monospace
Special Features: Dropdown with system fonts, Google Fonts integration option
Font Size Type:
Input Format: Number with unit (px, rem, em)
Validation: Positive number, must include unit
Example Values: 16px, 1rem, 1.125rem
Special Features: Preview text at specified size, conversion between units
Font Weight Type:
Input Format: Number (100-900) or keyword
Validation: Must be 100-900 in increments of 100, or valid keyword
Example Values: 400, 700, bold, semibold
Keywords Supported: thin (100), extralight (200), light (300), normal (400), medium (500), semibold (600), bold (700), extrabold (800), black (900)
Spacing Type:
Input Format: Number with unit (px, rem, em)
Validation: Positive number (or 0), must include unit
Example Values: 4px, 0.25rem, 1.5rem
Special Features: Tailwind spacing scale reference, rem/px converter
Border Radius Type:
Input Format: Number with unit (px, rem, %) or keyword
Validation: Positive number or valid keyword
Example Values: 8px, 0.5rem, 50%, 9999px
Keywords Supported: none, sm, md, lg, xl, 2xl, full
Special Features: Visual preview of rounded corners
Box Shadow Type:
Input Format: CSS shadow syntax (x y blur spread color)
Validation: Valid CSS shadow format
Example Values: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px 0 rgb(0 0 0 / 0.1)
Special Features: Multi-part input for each shadow component, layered shadows support (comma-separated)
Number Type:
Input Format: Unitless number (integer or decimal)
Validation: Valid number
Example Values: 1.5, 2, 1.618 (golden ratio), 0.75
Use Cases: Line height multipliers, opacity values (0-1), scale factors
Opacity Type:
Input Format: 0-1 decimal or 0-100 percentage
Validation: Must be between 0-1 or 0%-100%
Example Values: 0.8, 0.5, 75%, 50%
Special Features: Slider input for easy selection, preview overlay
Reference/Alias Support:
Reference Input Syntax:
Type opening curly brace { to trigger autocomplete
Format: {set-name.token-name}
Example: {global.blue-500}, {semantic.primary}
Reference Autocomplete:
Dropdown appears showing available tokens
Filtered by type compatibility (color refs only for color tokens)
Grouped by token set
Shows token preview (swatch for colors, value for others)
Search within dropdown supported
Keyboard navigation (arrow keys, enter to select)
Reference Validation:
System checks if referenced token exists in specified set
System checks if current set has permission to reference target set (based on hierarchy)
System prevents circular references by checking dependency chain
System shows warning icon if referenced token is deprecated or pending deletion
On save, system computes and stores resolved value for performance
Reference Chain Display:
Shows full resolution path: semantic.primary → global.blue-500 → #3B82F6
Clickable chain: click any step to navigate to that token
Helpful for understanding token dependencies
Save Behavior:
On Save Success:
Validates all required fields are filled correctly
Checks for naming conflicts within set
Creates token record in Supabase database
Sets token source field:
source = 'web_app' if created via web interface
source = 'figma' if pushed from Figma plugin
source = 'auto_generated' if created during project setup
If token contains references, resolves dependency chain and computes resolved_value
Updates token reference graph in token_references table for dependency tracking
Creates change record in changes table with source = 'web_app' and change_type = 'created'
Marks as "pending change" (unreleased)
Shows success notification toast: "Token created successfully"
Closes modal and returns to token list with new token highlighted
Scrolls to new token if not currently visible
On Save Error:
Shows error notification with specific issue
Highlights field(s) with errors
Keeps modal open for correction
Provides actionable error messages

1.5 Versioning & Releases
1.5.1 Change Detection System
Tracked Change Types:
Token Created:
From Web App: User creates new token via web interface
From Figma: User pushes new variable from Figma plugin
Data Captured: Token name, type, value, set, creator, timestamp, source
Token Modified:
Value Changed: Original value → new value stored
Description Updated: Old description → new description
Type Changed: Old type → new type (rare, requires compatible value)
Reference Updated: Old reference target → new reference target
Data Captured: All field changes with before/after states
Token Deleted:
Soft Delete: Token marked as deleted but retained for history
Data Captured: Complete token state at deletion time, deleter identity, timestamp, reason (if provided)
Token Renamed:
Name Change: Old name → new name stored
Reference Updates: All references to this token automatically updated
Data Captured: Name change, affected reference count, renamer identity
Change Detection UI: /projects/{project-id}/versions
Page Layout Components:
Header Section:
Page title: "Versions & Releases"
Subtitle: "Manage pending changes and create releases to push tokens to GitHub"
Primary action: "Create Release" button (prominent, disabled if no pending changes)
Secondary actions: "Discard All Changes" link (with confirmation modal)
Pending Changes Section:
Section Header:
Title with badge: "🟡 Pending Changes (8)" showing count
Filter dropdown: Filter by source (All | Web App | Figma), filter by change type (All | Created | Modified | Deleted)
Sort dropdown: Sort by date (newest/oldest), sort by source, sort by token set
Expand/collapse all toggle
Changes Grouped by Source:
Web App Changes Card:
Card Header:
Icon: 🌐 Web App
Count badge: "(3 changes)"
Expand/collapse chevron
Select all checkbox
Card Body (when expanded):
List of changes in chronological order
Each change shows: Change type badge (Created/Modified/Deleted), token name in monospace font, before/after values (for modifications), timestamp (relative: "2 hours ago"), user avatar and name, token set indicator
Change Item Detail Structure:
Modified Token Change:
┌──────────────────────────────────────────────────┐
│ 🔄 Modified: semantic.primary-color              │
│                                                  │
│ Before: {global.blue-500} → #3B82F6             │
│ After:  {global.blue-600} → #2563EB             │
│                                                  │
│ Impact: 8 tokens reference this                  │
│ • component.button-bg                            │
│ • component.link-color                           │
│ • component.focus-ring                           │
│ • ... (5 more) [View All]                        │
│
│ 2 hours ago by Jane Doe │ │ │ │ [Revert Change] [View Token] │ └──────────────────────────────────────────────────┘

**Added Token Change:**
┌──────────────────────────────────────────────────┐ │ ➕ Added: component.card-shadow │ │ │ │ Value: 0 4px 6px rgba(0,0,0,0.1) │ │ Type: Box Shadow │ │ Set: component │ │ │ │ Description: Default shadow for card components │ │ │ │ 1 hour ago by John Smith │ │ │ │ [Revert Change] [View Token] │ └──────────────────────────────────────────────────┘

**Deleted Token Change:**
┌──────────────────────────────────────────────────┐ │ ❌ Deleted: global.old-blue │ │ │ │ Previous value: #60A5FA │ │ Type: Color │ │ │ │ ⚠️ Was referenced by 2 tokens (now broken): │ │ • semantic.legacy-primary │ │ • component.deprecated-button │ │ │ │ 30 minutes ago by Jane Doe │ │ │ │ [Restore Token] [Fix References] │ └──────────────────────────────────────────────────┘

**Figma Changes Card:**
* **Card Header:**
  - Icon: 🎨 Figma
  - Count badge: "(5 changes)"
  - Expand/collapse chevron
  - Select all checkbox
  - Info tooltip: "Pushed from Figma by designers"
* **Card Body (when expanded):**
  - Same change item structure as Web App changes
  - Additional metadata: Figma file name, Figma file key, push timestamp

**Batch Push Indicator:**
When multiple changes come from single Figma push:
┌──────────────────────────────────────────────────┐ │ 📦 Batch Push from Figma │ │ 5 changes pushed together │ │ 15 minutes ago by Sarah Designer │ │ Figma file: Brand Design System │ │ │ │ [Expand to see all changes ▼] │ └──────────────────────────────────────────────────┘

**Empty State (No Pending Changes):**
┌──────────────────────────────────────────────────┐ │ │ │ ✨ All Clear │ │ │ │ No pending changes to release │ │ │ │ Changes from Figma or the web app will │ │ appear here before being released │ │ │ │ [Create Token] [Push from Figma] │ │ │ └──────────────────────────────────────────────────┘

**Conflict Detection Card:**

When same token modified in both sources:
┌──────────────────────────────────────────────────┐ │ ⚠️ CONFLICT DETECTED │ │ │ │ Token: global.blue-600 │ │ │ │ Change from Web App: │ │ #3B82F6 → #2563EB │ │ Modified 10 min ago by John Developer │ │ │ │ Change from Figma: │ │ #3B82F6 → #1E40AF │ │ Pushed 5 min ago by Sarah Designer │ │ │ │ Which version should be released? │ │ │ │ ◉ Figma version (#1E40AF) │ │ ○ Web App version (#2563EB) │ │ ○ Custom value: [_________________] │ │ │ │ Note: This will be included in the next release │ │ │ │ [Cancel] [Resolve Conflict] │ └──────────────────────────────────────────────────┘

**Conflict Resolution Logic:**
* Detected automatically when same token has multiple pending changes from different sources
* Change with latest timestamp shown first as suggested default
* User must manually resolve before creating release
* Resolution options: Choose Figma version, choose Web App version, enter custom value
* Once resolved, single change record replaces conflicting ones
* Conflict resolution logged with decision maker and chosen value

**Discard Changes Actions:**

**Discard Single Change:**
* Click "Revert Change" button on individual change item
* Shows confirmation modal: "Are you sure? This action cannot be undone."
* Options: Cancel (keep change), Discard (remove from pending)
* On confirm: Remove change from pending list, restore previous token state (for modifications/deletions), show undo notification (5 second window)

**Discard All Changes:**
* Click "Discard All Changes" link in section header
* Shows warning modal with impact summary: "You're about to discard 8 pending changes: 3 from Web App, 5 from Figma. This cannot be undone."
* Requires typing project name to confirm
* On confirm: Remove all pending changes, restore all tokens to last released state, log bulk discard action, show success notification

**Release History Section:**

**Section Header:**
* Title: "📦 Release History"
* Filter dropdown: Filter by version type (All | Major | Minor | Patch), filter by date range, filter by author
* Search input: Search releases by version number or commit message
* View toggle: List view / Timeline view

**Release List Item Structure:**
┌──────────────────────────────────────────────────┐ │ v1.2.0 · Minor [⋯] │ ├──────────────────────────────────────────────────┤ │ Released 2 days ago by Jane Doe │ │ "Updated primary color palette and spacing" │ │ │ │ Changes: 3 modified · 1 added │ │ Sources: 2 from Web App · 2 from Figma │ │ │ │ GitHub: PR #42 (Merged) ✓ │ │ Slack: Notification sent ✓ │ │ │ │ [View Details] [Download Export] [Rollback] │ └──────────────────────────────────────────────────┘

**Release Item Components:**
* **Version Header:** Version number with type badge (Major/Minor/Patch), overflow menu (⋯) with actions: Edit release notes, view in GitHub, delete release (danger action)
* **Metadata Line:** Timestamp (relative then absolute on hover), publisher name with avatar, commit message (truncated with "see more" if long)
* **Changes Summary:** Change count by type, breakdown by source (Web App vs Figma), colored badges for each type
* **Integration Status:** GitHub integration status (PR number, link, merge status), Slack notification status (sent/failed/not configured)
* **Action Buttons:** View Details (primary, opens detail view), Download Export (downloads shadcn config), Rollback (danger action, reverts to this version)

**Timeline View (Alternative):**
* Vertical timeline with dates on left axis
* Release nodes on timeline with connecting lines
* Major releases shown larger with prominent markers
* Shows gaps between releases with "days between" labels
* Click any release node to expand details inline

**Pagination:**
* Shows 10 releases per page
* Infinite scroll option or traditional pagination
* "Load more" button at bottom if many releases

---

#### 1.5.2 Create Release Flow

**Trigger Conditions:**
* "Create Release" button enabled only when pending changes exist (at least 1)
* Button shows tooltip if disabled: "No pending changes to release"
* Button can be clicked from Versions page or floating action in other pages

**Click "Create Release" Button:**

**Release Creation Modal:**

**Modal Structure - Full Screen Overlay:**

**Left Panel (60% width) - Release Configuration:**

**Section 1: Version Information**

**Current Version Display:**
* Shows current project version prominently (e.g., "Current: v1.2.0")
* Shows release history stats: Total releases, last release date, average time between releases
* Version timeline mini-visualization

**Version Number Input:**
* Label: "New Version Number *"
* Input field pre-filled based on version type selection
* Format: Three number inputs with dots: [1] . [3] . [0]
* Real-time validation: Checks semver format, ensures number progression, prevents duplicate versions
* Manual override allowed but shows warning if not following semantic versioning

**Version Type Selector:**
* Label: "Version Type *"
* Three radio button options with detailed descriptions:

**Major Option (1.2.0 → 2.0.0):**
* Radio button labeled "Major"
* Badge: Red "Breaking"
* Description: "Breaking changes that require code updates"
* Examples dropdown: "Renamed token sets, removed tokens, changed token structure"
* Recommendation indicator: Shows "Recommended" if deleted tokens in pending changes

**Minor Option (1.2.0 → 1.3.0) - Default:**
* Radio button labeled "Minor"
* Badge: Blue "Feature"
* Description: "New features and tokens, backward compatible"
* Examples: "Added new tokens, modified values, new color variants"
* Recommendation indicator: Shows "Recommended" if mostly additions and safe modifications

**Patch Option (1.2.0 → 1.2.1):**
* Radio button labeled "Patch"
* Badge: Green "Fix"
* Description: "Bug fixes and small corrections only"
* Examples: "Fixed typos, corrected values, minor adjustments"
* Recommendation indicator: Shows "Recommended" if only small value tweaks

**Auto-Selection Logic:**
* System analyzes pending changes and suggests version type
* Deleted tokens → suggests Major
* Only added tokens → suggests Minor
* Only modified values (no structural changes) → suggests Patch
* User can override suggestion

**Section 2: Release Message**

**Commit Message Input:**
* Label: "Commit Message *"
* Textarea (3 rows, auto-expands)
* Placeholder: "Describe what changed in this release..."
* Character counter: Shows remaining chars out of 500
* Suggestions button: Opens AI-generated message suggestions based on pending changes
* Template dropdown: Provides common templates:
  - "Updated [component] tokens"
  - "Added new [color scheme]"
  - "Breaking: Renamed token structure"
  - Custom (blank)

**Release Notes Section (Optional):**
* Label: "Detailed Release Notes (optional)"
* Rich text editor with markdown support
* Supports: Headings, lists, code blocks, links
* Preview toggle to see formatted output
* Used in GitHub PR description and changelog

**Section 3: Changes Preview**

**Changes in This Release:**
* Collapsible section showing all pending changes
* Header: "Changes in this release (8)" with expand/collapse
* Grouped by source with color coding:

**Web App Changes (3):**
✓ Modified: semantic.primary-color #3B82F6 → #2563EB
✓ Added: component.card-shadow 0 4px 6px rgba(0,0,0,0.1)
✓ Deleted: global.old-blue

**Figma Changes (5):**
✓ Added: global.blue-600 #2563EB
✓ Modified: global.spacing-lg 24px → 32px
✓ Added: global.spacing-xxl 48px
✓ ... (2 more changes) [Expand to see all]

**Checkboxes for Selective Release (Future Feature):**
* Each change has checkbox (currently all checked and disabled)
* Future: Allow users to select which changes to include in release
* Maintains dependency integrity (can't release token without its references)

**Section 4: Impact Analysis**

**Auto-Computed Statistics Card:**
┌──────────────────────────────────────────────────┐ │ 📊 Impact Analysis │ ├──────────────────────────────────────────────────┤ │ │ │ Source Breakdown: │ │ • 3 changes from Web App │ │ • 5 changes from Figma │ │ │ │ Change Types: │ │ • 2 raw values changed │ │ • 5 tokens added │ │ • 1 token deleted │ │ │ │ Dependencies: │ │ • 12 tokens affected by references │ │ • 3 components may need updates │ │ │ │ Risk Level: Medium │ │ • Deleted token requires code updates │ │ • Modified primary color affects 8 tokens │ │ │ └──────────────────────────────────────────────────┘

**Impact Indicators:**
* **Low Risk:** Green indicator, only additions or minor value tweaks
* **Medium Risk:** Yellow indicator, modifications to widely-used tokens
* **High Risk:** Red indicator, deletions or breaking changes
* Expandable details showing which tokens/components affected

**Section 5: GitHub Integration**

**GitHub Actions Configuration:**

**Create Pull Request Checkbox:**
* Always checked and disabled (required for release)
* Label: "✓ Create Pull Request"
* Description: "Required - Creates PR with token export files"
* Shows target repository and branch below: `acme/design-tokens` → `main`
* Link to reconfigure: "Change repository settings"

**PR Details Preview:**
* Collapsible section showing what will be included in PR
* PR Title: Auto-generated from version and message
* PR Description: Shows formatted markdown with all changes
* PR Labels: Auto-tagged (fragmento, design-tokens, version type)
* Reviewers: Option to assign reviewers (if configured)

**Notify Slack Checkbox (if configured):**
* Checkbox: "☑ Notify Slack"
* Label: "Send release notification to #design-system"
* Only visible if Slack integration configured
* Shows preview of notification message
* Option to customize notification message

**Right Panel (40% width) - Preview & Validation:**

**Section 1: Export Preview**

**shadcn/ui Configuration Preview:**
* Title: "📦 shadcn/ui Export Preview"
* Shows first 20 lines of generated config
* Syntax highlighted code display
* Tab selector: globals.css | tailwind.config.ts | components.json
* "View Full Export" button opens full preview modal

**Preview Content Example:**
````css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    
    /* ... */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... */
  }
}
````

**Section 2: Validation Status**

**Pre-Release Checks:**
┌──────────────────────────────────────────────────┐ │ ✓ All checks passed │ ├──────────────────────────────────────────────────┤ │ │ │ ✓ Version number valid │ │ ✓ No conflicting changes │ │ ✓ All references resolved │ │ ✓ GitHub integration configured │ │ ✓ No circular dependencies │ │ ✓ Export configuration valid │ │ │ └──────────────────────────────────────────────────┘

**If Issues Found:**
┌──────────────────────────────────────────────────┐ │ ⚠️ 2 issues found │ ├──────────────────────────────────────────────────┤ │ │ │ ⚠️ Broken reference detected │ │ Token: semantic.legacy-primary │ │ References: global.old-blue (deleted) │ │ [Fix Reference] │ │ │ │ ⚠️ Circular dependency │ │ Chain: A → B → C → A │ │ [View Details] │ │ │ └──────────────────────────────────────────────────┘

**Validation Issues Prevent Release:**
* Create Release button disabled if validation fails
* Each issue has "Fix" action that jumps to relevant token
* Real-time validation as user makes changes
* Clear error messages with actionable solutions

**Section 3: Release Timeline Estimate**

**Process Steps Preview:**
✓ Validate changes (instant)
⏳ Generate export files (~5 sec)
⏳ Create GitHub branch (~3 sec)
⏳ Commit files to branch (~5 sec)
⏳ Create Pull Request (~2 sec)
⏳ Send Slack notification (~1 sec)
Estimated time: ~16 seconds

**Modal Footer:**

**Action Buttons:**
* **Cancel:** Secondary button, closes modal, asks confirmation if unsaved changes, keyboard shortcut: Esc
* **Create Release:** Primary button, large and prominent, shows loading state with progress, disabled if validation fails, keyboard shortcut: Cmd/Ctrl + Enter

**Release Creation Process:**

**Step-by-Step Execution with Progress Indicator:**

**Step 1: Validation (instant)**
* Check GitHub integration exists and is active
* Verify version number follows semver and doesn't conflict
* Ensure commit message is not empty (min 10 chars)
* Check for version number conflicts with existing releases
* Validate all token references can be resolved
* Check no circular dependencies exist
* Show progress: "Validating release configuration..."

**Step 2: Generate Export Files (~5 seconds)**
* Fetch all tokens from database (from both web app and Figma sources)
* Resolve all token references recursively
* Transform tokens to shadcn/ui format
* Generate three files: globals.css, tailwind.config.ts, components.json
* Add metadata comments (version, timestamp, sources)
* Show progress: "Generating shadcn/ui configuration files..."

**Generated Files Structure:**

**globals.css:**
````css
/**
 * Fragmento Design Tokens
 * Version: v1.3.0
 * Generated: 2024-11-18T14:30:00Z
 * Sources: 3 from Web App, 5 from Figma
 */

@layer base {
  :root {
    /* Background colors */
    --background: 0 0% 100%; /* global.white */
    --foreground: 222.2 84% 4.9%; /* global.slate-900 */
    
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    
    /* Primary colors */
    --primary: 221.2 83.2% 53.3%; /* semantic.primary → global.blue-600 */
    --primary-foreground: 210 40% 98%;
    
    /* Secondary colors */
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    
    /* Muted colors */
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    
    /* Accent colors */
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    
    /* Destructive colors */
    --destructive: 0 84.2% 60.2%; /* semantic.destructive → global.red-500 */
    --destructive-foreground: 210 40% 98%;
    
    /* Border colors */
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    
    /* Border radius */
    --radius: 0.5rem; /* global.radius-lg */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
````

**tailwind.config.ts:**
````typescript
/**
 * Fragmento Design Tokens
 * Version: v1.3.0
 * Generated: 2024-11-18T14:30:00Z
 */

import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
````

**components.json:**
````json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  },
  "fragmento": {
    "version": "v1.3.0",
    "projectId": "proj_abc123",
    "generatedAt": "2024-11-18T14:30:00Z",
    "sources": {
      "webApp": 3,
      "figma": 5
    }
  }
}
````

**Step 3: GitHub Actions (~10 seconds total)**

**3a. Create Branch:**
* Branch name format: `fragmento-release-v1.3.0`
* Based on configured target branch (default: `main`)
* Uses GitHub API with configured personal access token
* Show progress: "Creating GitHub branch..."

**3b. Commit Files:**
* Commits all three generated files to new branch
* Commit message from user input
* Commit author: Fragmento Bot with user attribution
* Show progress: "Committing files to GitHub..."

**3c. Create Pull Request:**
* PR title: `Fragmento Release v1.3.0`
* PR body: Formatted markdown with all changes

**PR Description Template:**
````markdown
# Fragmento Release v1.3.0

Updated colors and spacing from design

## Changes Summary

### From Web App (3 changes)
- **Modified:** `semantic.primary-color`  
  `#3B82F6` → `#2563EB`  
  Impact: 8 tokens reference this
  
- **Added:** `component.card-shadow`  
  `0 4px 6px rgba(0,0,0,0.1)`
  
- **Deleted:** `global.old-blue`  
  ⚠️ Was referenced by 2 tokens (now broken)

### From Figma (5 changes)
- **Added:** `global.blue-600` → `#2563EB`
- **Modified:** `global.spacing-lg` → `24px` → `32px`
- **Added:** `global.spacing-xxl` → `48px`
- **Modified:** `semantic.text-color`
- **Added:** `component.button-hover-bg`

## Impact Analysis

- 12 tokens affected by reference changes
- 6 new tokens
- 1 token removed

## Files Changed

- `app/globals.css` - shadcn/ui CSS variables
- `tailwind.config.ts` - Tailwind theme configuration
- `components.json` - shadcn/ui component configuration

## Installation
```bash
# Copy the updated files to your project
# Then restart your dev server
npm run dev
```

---

Generated by [Fragmento](https://fragmento.app)  
Project: Brand Design System  
Published by: Jane Doe  
````

**PR Labels Applied:**
* `fragmento` - Auto-applied to all Fragmento PRs
* `design-tokens` - Indicates token changes
* `minor` - Based on version type (major/minor/patch)

* Show progress: "Creating Pull Request..."

**Step 4: Slack Notification (~1 second)**

If Slack integration enabled and checkbox checked:

**Slack Message Format:**
📦 New Release: v1.3.0
Updated colors and spacing from design
Changes:
3 from Web App • 5 from Figma
3 modified • 6 added • 1 deleted
Impact:
12 tokens affected by reference changes
Medium risk level
👤 Published by Jane Doe 🔗 View PR: github.com/acme/tokens/pull/42 📄 View in Fragmento: fragmento.app/projects/abc123/releases/v1.3.0

Show progress: "Sending Slack notification..."

**Step 5: Database Updates**

**Create Release Record:**
* Insert into `releases` table
* Fields populated:
  - `version`: v1.3.0
  - `version_type`: minor
  - `commit_message`: User's message
  - `github_pr_url`: Generated PR URL
  - `github_pr_number`: PR number from GitHub API
  - `changes_from_web_app`: 3
  - `changes_from_figma`: 5
  - `published_by`: Current user ID
  - `published_at`: Current timestamp

**Update Changes Records:**
* Mark all pending changes as released
* Set `released_in_version` to new release ID
* Changes move from "pending" to "released" state

**Clear Pending State:**
* All pending changes now associated with release
* Pending changes count resets to 0
* Next changes will be for next release

**Success Notification:**

Modal closes and shows success toast:
┌─────────────────────────────────────────┐ │ ✓ Release Created Successfully │ ├─────────────────────────────────────────┤ │ Version v1.3.0 has been created │ │ │ │ ✓ GitHub PR #42 created │ │ ✓ Slack notification sent │ │ ✓ 8 changes released to GitHub │ │ │ │ Next steps: │ │ • Review and merge PR on GitHub │ │ • Update your project with new tokens │ │ │ │ [View Release] [View PR] [Download] │ └─────────────────────────────────────────┘

**Post-Release Actions:**
* User redirected to release detail page
* PR link opens in new tab (optional)
* Download buttons available for export files
* Pending changes section now shows "All Clear" state

**Error Handling:**

If any step fails, show specific error message:

**GitHub API Error:**
┌─────────────────────────────────────────┐ │ ❌ Release Creation Failed │ ├─────────────────────────────────────────┤ │ Error creating GitHub Pull Request │ │ │ │ GitHub API returned: │ │ "Resource not accessible by integration"│ │ │ │ Possible fixes: │ │ • Check GitHub token permissions │ │ • Verify repository access │ │ • Ensure branch protection allows PRs │ │ │ │ [Retry] [
Check Integration] [Contact Support] │ └─────────────────────────────────────────┘

**Validation Error:**
┌─────────────────────────────────────────┐ │ ❌ Cannot Create Release │ ├─────────────────────────────────────────┤ │ Broken token reference detected │ │ │ │ Token: semantic.legacy-primary │ │ References: global.old-blue (deleted) │ │ │ │ Please fix this issue before releasing: │ │ • Update the reference to valid token │ │ • Or remove the referencing token │ │ │ │ [Fix Reference] [Cancel] │ └─────────────────────────────────────────┘

**Partial Success Handling:**

If PR created but Slack fails:
┌─────────────────────────────────────────┐ │ ⚠️ Release Created with Warnings │ ├─────────────────────────────────────────┤ │ Version v1.3.0 created successfully │ │ │ │ ✓ GitHub PR #42 created │ │ ❌ Slack notification failed │ │ │ │ Release is complete, but team was not │ │ notified via Slack. You can manually │ │ share the PR link. │ │ │ │ [View Release] [Retry Slack] [Dismiss]│ └─────────────────────────────────────────┘

---

#### 1.5.3 Release Detail View

**Entry Point:** Click "View Details" on any release from release history list

**Page URL:** `/projects/{project-id}/releases/v1.3.0`

**Page Layout:**

**Header Section:**

**Breadcrumb Navigation:**
* Dashboard → Project Name → Releases → v1.3.0
* Back button: "← Back to Releases"

**Release Header Card:**
┌──────────────────────────────────────────────────┐ │ Release v1.3.0 │ │ Minor Release [⋯] │ ├──────────────────────────────────────────────────┤ │ │ │ 👤 Published by Jane Doe │ │ 📅 November 18, 2024 at 2:30 PM (2 hours ago) │ │ │ │ 📝 "Updated colors and spacing from design" │ │ │ │ GitHub: PR #42 · Merged ✓ │ │ [View on GitHub] │ │ │ │ Slack: Notification sent ✓ │ │ [View in Slack] │ │ │ └──────────────────────────────────────────────────┘

**Header Components:**
* **Version Title:** Large text showing version number with type badge
* **Overflow Menu (⋯):** Dropdown with actions - Edit release notes, regenerate export files, create hotfix from this version, delete release (danger action, requires confirmation)
* **Publisher Info:** Avatar, name, and role of person who created release
* **Timestamp:** Absolute date/time with relative time in parentheses
* **Commit Message:** User's release message displayed prominently
* **GitHub Integration Status:** Shows PR number with status badge (Open/Merged/Closed), link opens PR in new tab, shows merge commit SHA if merged
* **Slack Integration Status:** Shows if notification was sent successfully, link opens Slack channel (if available)

**Tab Navigation:**

**Four Main Tabs:**
1. **Changes** - List of all changes in this release
2. **Export Files** - Download shadcn/ui configuration files
3. **Impact** - Detailed impact analysis and affected tokens
4. **Activity** - Timeline of events for this release

**Tab 1: Changes View (Default)**

**Changes Summary Card:**
┌──────────────────────────────────────────────────┐ │ 📊 Changes Overview │ ├──────────────────────────────────────────────────┤ │ │ │ Total: 8 changes │ │ │ │ By Source: │ │ • 🌐 Web App: 3 changes │ │ • 🎨 Figma: 5 changes │ │ │ │ By Type: │ │ • ✏️ Modified: 2 │ │ • ➕ Added: 5 │ │ • ❌ Deleted: 1 │ │ │ └──────────────────────────────────────────────────┘

**Filter Controls:**
* Filter by source: All | Web App | Figma
* Filter by type: All | Modified | Added | Deleted
* Filter by token set: All | global | semantic | component
* Sort: Chronological | Alphabetical | By Impact

**Changes List - Grouped by Source:**

**Web App Changes Section:**
┌──────────────────────────────────────────────────┐ │ 🌐 From Web App (3 changes) │ ├──────────────────────────────────────────────────┤ │ │ │ ✏️ Modified: semantic.primary-color │ │ ┌────────────────────────────────────────────┐ │ │ │ Before: {global.blue-500} → #3B82F6 │ │ │ │ After: {global.blue-600} → #2563EB │ │ │ │ │ │ │ │ Impact: Affected 8 tokens │ │ │ │ • component.button-bg │ │ │ │ • component.link-color │ │ │ │ • component.focus-ring │ │ │ │ • component.icon-primary │ │ │ │ • component.card-border-hover │ │ │ │ • ... (3 more) [Show All] │ │ │ │ │ │ │ │ Modified by: Jane Doe │ │ │ │ 3 hours before release │ │ │ └────────────────────────────────────────────┘ │ │ │ │ ➕ Added: component.card-shadow │ │ ┌────────────────────────────────────────────┐ │ │ │ Value: 0 4px 6px rgba(0,0,0,0.1) │ │ │ │ Type: Box Shadow │ │ │ │ Set: component │ │ │ │ │ │ │ │ Description: Default shadow for card │ │ │ │ components, provides subtle elevation │ │ │ │ │ │ │ │ Added by: John Smith │ │ │ │ 2 hours before release │ │ │ └────────────────────────────────────────────┘ │ │ │ │ ❌ Deleted: global.old-blue │ │ ┌────────────────────────────────────────────┐ │ │ │ Previous value: #60A5FA │ │ │ │ Type: Color │ │ │ │ │ │ │ │ ⚠️ Breaking Change │ │ │ │ Was referenced by 2 tokens: │ │ │ │ • semantic.legacy-primary (broken) │ │ │ │ • component.deprecated-button (broken) │ │ │ │ │ │ │ │ Action Required: Update or remove │ │ │ │ referencing tokens in next release │ │ │ │ │ │ │ │ Deleted by: Jane Doe │ │ │ │ 1 hour before release │ │ │ └────────────────────────────────────────────┘ │ │ │ └──────────────────────────────────────────────────┘

**Figma Changes Section:**
┌──────────────────────────────────────────────────┐ │ 🎨 From Figma (5 changes) │ │ Pushed by: Sarah Designer │ │ Figma file: Brand Design System │ ├──────────────────────────────────────────────────┤ │ │ │ ➕ Added: global.blue-600 │ │ ┌────────────────────────────────────────────┐ │ │ │ Value: #2563EB │ │ │ │ Type: Color │ │ │ │ Set: global │ │ │ │ │ │ │ │ Now used by 9 tokens │ │ │ │ Including: semantic.primary-color │ │ │ │ │ │ │ │ Part of batch push (5 changes) │ │ │ │ 1 hour before release │ │ │ └────────────────────────────────────────────┘ │ │ │ │ ✏️ Modified: global.spacing-lg │ │ ┌────────────────────────────────────────────┐ │ │ │ Before: 24px (1.5rem) │ │ │ │ After: 32px (2rem) │ │ │ │ │ │ │ │ Impact: Affected 4 tokens │ │ │ │ • semantic.section-spacing │ │ │ │ • component.card-padding-lg │ │ │ │ • component.dialog-padding │ │ │ │ • component.sidebar-width │ │ │ │ │ │ │ │ Part of batch push (5 changes) │ │ │ │ 1 hour before release │ │ │ └────────────────────────────────────────────┘ │ │ │ │ ➕ Added: global.spacing-xxl │ │ ┌────────────────────────────────────────────┐ │ │ │ Value: 48px (3rem) │ │ │ │ Type: Spacing │ │ │ │ Set: global │ │ │ │ │ │ │ │ Part of batch push (5 changes) │ │ │ │ 1 hour before release │ │ │ └────────────────────────────────────────────┘ │ │ │ │ ... [2 more changes] [Expand All] │ │ │ └──────────────────────────────────────────────────┘

**Change Item Interactions:**
* Click change card to expand/collapse details
* Hover shows quick preview tooltip
* Copy button to copy token name or value
* "View Token" button navigates to current token state
* "View History" shows all changes to this token over time

**Tab 2: Export Files View**

**Export Files Grid:**
┌──────────────────────────────────────────────────┐ │ 📦 shadcn/ui Configuration Files │ ├──────────────────────────────────────────────────┤ │ │ │ Three files generated for this release: │ │ │ │ ┌────────────────────────────────────────────┐ │ │ │ 📄 globals.css │ │ │ │ │ │ │ │ CSS Variables for shadcn/ui │ │ │ │ Size: 3.2 KB │ │ │ │ │ │ │ │ [Download] [Copy] [Preview] │ │ │ └────────────────────────────────────────────┘ │ │ │ │ ┌────────────────────────────────────────────┐ │ │ │ 📄 tailwind.config.ts │ │ │ │ │ │ │ │ Tailwind theme configuration │ │ │ │ Size: 2.1 KB │ │ │ │ │ │ │ │ [Download] [Copy] [Preview] │ │ │ └────────────────────────────────────────────┘ │ │ │ │ ┌────────────────────────────────────────────┐ │ │ │ 📄 components.json │ │ │ │ │ │ │ │ shadcn/ui component configuration │ │ │ │ Size: 0.8 KB │ │ │ │ │ │ │ │ [Download] [Copy] [Preview] │ │ │ └────────────────────────────────────────────┘ │ │ │ │ [Download All as ZIP] │ │ │ └──────────────────────────────────────────────────┘
### 1.7 Integrations

**Entry Point:** `/projects/{project-id}/integrations`

**Page Layout:**

**Header Section:**
* Title: "Integrations"
* Subtitle: "Connect Fragmento with GitHub and Slack"
* Info: "Integrations enable automatic releases to GitHub and team notifications"

**Integration Cards:**

**GitHub Integration Card:**
┌──────────────────────────────────────────────────┐ │ 🔗 GitHub │ │ Version Control & Release Management [Edit] │ ├──────────────────────────────────────────────────┤ │ │ │ Status: ✓ Connected and active │ │ │ │ Repository: acme/design-tokens │ │ Branch: main │ │ Access: Read & Write │ │ │ │ Last sync: 2 hours ago (v1.3.0) │ │ Pull Request: #42 (Merged) │ │ │ │ Configuration: │ │ • Auto-create PR: Enabled │ │ • Target branch: main │ │ • File path: / (root directory) │ │ • PR labels: fragmento, design-tokens │ │ │ │ [View on GitHub] [Test Connection] │ │ [Reconfigure] [Disconnect] │ │ │ └──────────────────────────────────────────────────┘

**GitHub Card Components:**
* **Status Indicator:** Green check for connected, red X for disconnected, yellow warning for issues
* **Repository Info:** Shows owner/repo, branch, access level
* **Last Sync:** Shows most recent release with PR status
* **Configuration Summary:** Lists key settings
* **Action Buttons:** View on GitHub (opens repo), test connection (validates token), reconfigure (edit settings), disconnect (removes integration)

**GitHub Not Connected State:**
┌──────────────────────────────────────────────────┐ │ 🔗 GitHub │ │ Version Control & Release Management │ ├──────────────────────────────────────────────────┤ │ │ │ Status: Not connected │ │ │ │ Connect GitHub to automatically push token │ │ files to your repository when you create │ │ releases. │ │ │ │ What you get: │ │ ✓ Automatic Pull Requests │ │ ✓ Version-controlled token history │ │ ✓ Team code review workflow │ │ ✓ CI/CD pipeline integration │ │ │ │ [Connect GitHub] │ │ │ └──────────────────────────────────────────────────┘

**GitHub Configuration Modal:**

**Click "Reconfigure" or "Connect GitHub":**
┌─────────────────────────────────────────────────┐ │ Configure GitHub Integration [✕] │ ├─────────────────────────────────────────────────┤ │ │ │ Personal Access Token * │ │ [ghp_xxxxxxxxxxxxxxxxxxxx___________] │ │ │ │ ℹ️ Required scopes: repo (full access) │ │ [Generate token on GitHub] │ │ │ │ Repository Owner * │ │ [acme_______________________________] │ │ │ │ Repository Name * │ │ [design-tokens____________________ ] │ │ │ │ Target Branch * │ │ [main_______________________________] │ │ │ │ File Path (optional) │ │ [tokens/__________________] │ │ Default: / (root directory) │ │ │ │ Pull Request Settings │ │ ☑ Auto-assign reviewers │ │ Reviewers: [jane,mike___________] │ │ │ │ ☑ Add labels to PR │ │ Labels: [fragmento,design-tokens] │ │ │ │ ☑ Auto-merge when approved (if enabled) │ │ │ │ [Verify Connection] │ │ │ │ Status: 🔄 Not verified yet │ │ │ │ [Cancel] [Save] │ └─────────────────────────────────────────────────┘

**Form Fields:**
* **Personal Access Token:** GitHub PAT with repo scope, secure input (masked), link to GitHub token generation page
* **Repository Owner:** GitHub username or organization name
* **Repository Name:** Name of repository to push to
* **Target Branch:** Branch where PRs will be created (usually main or develop)
* **File Path:** Optional subdirectory for token files
* **PR Settings:** Checkboxes for various PR options
* **Verify Connection:** Tests credentials and access before saving

**Verification Process:**

**Click "Verify Connection":**
Status: 🔄 Verifying...
Checking:
Token validity...
Repository access...
Branch existence...
Write permissions...

**Success State:**
Status: ✓ Verified successfully
✓ Token is valid ✓ Repository found: acme/design-tokens ✓ Branch exists: main ✓ Write access confirmed
Ready to save configuration.

**Error State:**
Status: ❌ Verification failed
Error: Repository not found or token lacks access
Please check:
Token has 'repo' scope
Repository name is correct (owner/repo)
You have write access to the repository
Repository is not archived
[Check Documentation]

**Slack Integration Card:**
┌──────────────────────────────────────────────────┐ │ 💬 Slack │ │ Team Notifications (Organization plan) [Edit] │ ├──────────────────────────────────────────────────┤ │ │ │ Status: ✓ Connected and active │ │ │ │ Workspace: Acme Inc │ │ Channel: #design-system │ │ │ │ Last notification: 2 hours ago │ │ "Release v1.3.0 published" │ │ │ │ Notification Events: │ │ ☑ New release published │ │ ☑ PR merged to main │ │ ☐ Team member added │ │ ☐ Figma changes pushed │ │ │ │ [Send Test Message] [View in Slack] │ │ [Reconfigure] [Disconnect] │ │ │ └──────────────────────────────────────────────────┘

**Slack Not Connected State:**
┌──────────────────────────────────────────────────┐ │ 💬 Slack │ │ Team Notifications │ ├──────────────────────────────────────────────────┤ │ │ │ Status: Not connected │ │ │ │ 🔒 Organization plan required │ │ │ │ Keep your team informed about token updates: │ │ ✓ Release notifications │ │ ✓ PR merge alerts │ │ ✓ Team activity updates │ │ │ │ [Upgrade to Organization] │ │ │ └──────────────────────────────────────────────────┘

**Slack Configuration Modal:**

**Click "Reconfigure" or "Connect Slack":**
┌─────────────────────────────────────────────────┐ │ Configure Slack Integration [✕] │ ├─────────────────────────────────────────────────┤ │ │ │ Webhook URL * │ │ [https://hooks.slack.com/services/T00/_] │ │ [____________________________] │ │ │ │ ℹ️ Create a webhook in Slack: │ │ 1. Go to api.slack.com/apps │ │ 2. Create new app or select existing │ │ 3. Enable "Incoming Webhooks" │ │ 4. Add webhook to workspace │ │ 5. Copy webhook URL │ │ │ │ [Open Slack Apps] │ │ │ │ Channel Name * │ │ [#design-system_________________] │ │ │ │ Notification Events │ │ ☑ New release published │ │ Notify when a release is created │ │ │ │ ☑ PR merged to main │ │ Notify when GitHub PR is merged │ │ │ │ ☐ Team member added to project │ │ Notify when someone joins the team │ │ │ │ ☐ Figma changes pushed │ │ Notify when designer pushes from Figma │ │ │ │ Notification Format │ │ ◉ Detailed (includes change summary) │ │ ○ Compact (just version and link) │ │ │ │ [Send Test Notification] │ │ │ │ [Cancel] [Save] │ └─────────────────────────────────────────────────┘

**Test Slack Notification:**

**Click "Send Test Notification":**

Shows preview in modal:
Preview of Slack message:
🔔 Fragmento Test Notification
This is a test notification from Fragmento.
✓ Integration configured successfully!
Future notifications will appear in #design-system when:
New releases are published
Pull requests are merged
[Send to Slack] [Cancel]

**In Slack Channel (after sending):**
Fragmento APP 2:30 PM 🔔 Fragmento Test Notification
This is a test notification from Fragmento. ✓ Integration configured successfully!
Future notifications will appear here when:
New releases are published
Pull requests are merged

**Real Release Notification in Slack:**
Fragmento APP 2:30 PM 📦 New Release: v1.3.0
Updated colors and spacing from design
Changes:
3 from Web App • 5 from Figma
3 modified • 6 added • 1 deleted
Impact:
12 tokens affected by reference changes
Medium risk level
👤 Published by Jane Doe 🔗 View PR: github.com/acme/tokens/pull/42 📄 View in Fragmento: fragmento.app/projects/abc123/releases/v1.3.0
### 1.8 Project Settings

**Entry Point:** `/projects/{project-id}/settings`

**Page Layout organized in sections:**

**Section 1: General Settings**
┌──────────────────────────────────────────────────┐ │ General │ ├──────────────────────────────────────────────────┤ │ │ │ Project Name * │ │ [Brand Design System______________] │ │ │ │ Project Slug (URL-friendly name) │ │ brand-design-system │ │ Used in URLs: /projects/brand-design-system │ │ │ │ Description │ │ [Design tokens for brand refresh_____] │ │ [________________________________] │ │ │ │ [Update Project Info] │ │ │ └──────────────────────────────────────────────────┘

**General Settings Components:**
* **Project Name Input:** Text field, 3-50 characters, shows character count, real-time validation
* **Project Slug:** Auto-generated from name, read-only display, shows where it's used (URLs, exports, GitHub)
* **Description Textarea:** Optional, max 500 characters, supports markdown
* **Update Button:** Saves changes, shows success toast, disabled until changes made

**Section 2: Access Control**
┌──────────────────────────────────────────────────┐ │ Access Control │ ├──────────────────────────────────────────────────┤ │ │ │ Default Access for New Members │ │ ◉ View Only │ │ New members can view tokens and releases │ │ │ │ ○ Can Edit │ │ New members can create and modify tokens │ │ │ │ Public Link Sharing │ │ ○ Disabled │ │ Project is private, invitation only │ │ │ │ ◉ View Only │ │ Anyone with link can view (read-only) │ │ │ │ ○ Can Edit (Organization plan only) │ │ Anyone with link can edit tokens │ │ │ │ ℹ️ Share link: fragmento.app/p/abc123xyz │ │ [Copy Link] [Regenerate Link] │ │ │ │ [Save Access Settings] │ │ │ └──────────────────────────────────────────────────┘

**Access Control Components:**
* **Default Access Radio Group:** Two options (View Only/Can Edit), applies to newly invited members
* **Public Link Sharing Radio Group:** Three options (Disabled/View Only/Can Edit), controls anonymous access via shared link
* **Share Link Display:** Shows current public link if enabled, greyed out if disabled
* **Copy Link Button:** Copies link to clipboard with success notification
* **Regenerate Link Button:** Creates new link, invalidates old one, requires confirmation
* **Save Button:** Applies access control changes

**Section 3: Team Members**
┌──────────────────────────────────────────────────┐ │ Team Members │ ├──────────────────────────────────────────────────┤ │ │ │ [+ Invite Member] [Search members...] │ │ │ │ ┌────────────────────────────────────────────┐ │ │ │ 👤 Jane Doe (You) │ │ │ │ jane@acme.com │ │ │ │ Owner • Can Edit │ │ │ │ Joined: November 1, 2024 │ │ │ │ │ │ │ │ [Can Edit ▼] [Remove] │ │ │ │ (disabled - you're the owner) │ │ │ └────────────────────────────────────────────┘ │ │ │ │ ┌────────────────────────────────────────────┐ │ │ │ 👤 John Smith │ │ │ │ john@acme.com │ │ │ │ Member • Can Edit │ │ │ │ Joined: November 5, 2024 │ │ │ │ │ │ │ │ [Can Edit ▼] [Remove] │ │ │ └────────────────────────────────────────────┘ │ │ │ │ ┌────────────────────────────────────────────┐ │ │ │ 👤 Sarah Johnson │ │ │ │ sarah@acme.com │ │ │ │ Member • View Only │ │ │ │ Joined: November 10, 2024 │ │ │ │ │ │ │ │ [View Only ▼] [Remove] │ │ │ └────────────────────────────────────────────┘ │ │ │ │ Pending Invitations (1) │ │ ┌────────────────────────────────────────────┐ │ │ │ 📧 mike@acme.com │ │ │ │ View Only • Expires in 5 days │ │ │ │ Invited by: Jane Doe │ │ │ │ │ │ │ │ [Resend] [Cancel Invitation] │ │ │ └────────────────────────────────────────────┘ │ │ │ └──────────────────────────────────────────────────┘

**Team Members Components:**

**Header Actions:**
* **Invite Member Button:** Primary action, opens invitation modal
* **Search Input:** Filters member list by name or email

**Member Card Structure:**
* **Avatar:** User profile picture or initials
* **Name:** Full name with "(You)" indicator for current user
* **Email:** User's email address
* **Role and Access:** Shows organization role and project access level
* **Joined Date:** When user was added to project
* **Access Dropdown:** Change member's access level (View Only/Can Edit), disabled for owner (can't change own access)
* **Remove Button:** Removes member from project, requires confirmation, disabled for owner (can't remove self)

**Pending Invitations Section:**
* Shows invitations not yet accepted
* Displays expiration countdown
* Shows who sent invitation
* Actions: Resend (sends new email), Cancel (deletes invitation)

**Invite Member Modal:**

**Click "+ Invite Member":**
┌─────────────────────────────────────────────────┐ │ Invite Team Member [✕] │ ├─────────────────────────────────────────────────┤ │ │ │ Email Address * │ │ [sarah@acme.com_____________________] │ │ │ │ Access Level * │ │ ◉ View Only │ │ Can view tokens, releases, and history │ │ Cannot create or modify tokens │ │ Cannot create releases │ │ │ │ ○ Can Edit │ │ Can create, modify, and delete tokens │ │ Can create releases and push to GitHub │ │ Cannot modify project settings │ │ │ │ Personal Message (optional) │ │ [Hey Sarah, we're collaborating on____] │ │ [the design system. Let me know if_____] │ │ [you need help getting started!_________] │ │ │ │ This invitation will expire in 7 days │ │ │ │ [Cancel] [Send Invite] │ └─────────────────────────────────────────────────┘

**Invitation Modal Components:**
* **Email Input:** Validates email format, checks if user already member, checks if invitation already sent
* **Access Level Radio Group:** Two detailed options with permissions listed
* **Personal Message Textarea:** Optional, max 500 characters, included in invitation email
* **Expiration Notice:** Shows when invitation will expire (7 days)
* **Send Button:** Sends invitation email, creates pending invitation record

**Invitation Email Sent:**
Subject: Jane Doe invited you to "Brand Design System" on Fragmento
Hi Sarah,
Jane Doe has invited you to collaborate on the "Brand Design System" project in Fragmento.
Access Level: View Only
Personal message from Jane: "Hey Sarah, we're collaborating on the design system. Let me know if you need help getting started!"
[Accept Invitation]
This invitation expires in 7 days (November 25, 2024).
If you don't have a Fragmento account, you'll be able to create one when you accept the invitation.

Fragmento - Design Token Management for shadcn/ui

**Section 4: Danger Zone**
┌──────────────────────────────────────────────────┐ │ Danger Zone │ ├──────────────────────────────────────────────────┤ │ │ │ ⚠️ Delete Project │ │ │ │ Permanently delete this project and all │ │ its data. This action cannot be undone. │ │ │ │ What will be deleted: │ │ • All tokens (53 tokens across 3 sets) │ │ • All releases (12 versions) │ │ • All pending changes (5 unreleased) │ │ • Team member access │ │ • Integration configurations │ │ │ │ GitHub repository and Slack channel will │ │ not be affected. │ │ │ │ [Delete Project] │ │ │ └──────────────────────────────────────────────────┘

**Delete Project Confirmation:**

**Click "Delete Project":**
┌─────────────────────────────────────────────────┐ │ ⚠️ Delete Project: Brand Design System [✕] │ ├─────────────────────────────────────────────────┤ │ │ │ This action cannot be undone! │ │ │ │ This will permanently delete: │ │ • 53 tokens across 3 token sets │ │ • 12 release versions │ │ • 5 unreleased pending changes │ │ • Access for 4 team members │ │ • GitHub and Slack integrations │ │ │ │ Your GitHub repository will not be affected. │ │ Previously released token files will remain. │ │ │ │ To confirm deletion, type the project name: │ │ Brand Design System │ │ │ │ [___________________________________] │ │ │ │ [Cancel] [Delete Project Forever] │ └─────────────────────────────────────────────────┘

**Deletion Confirmation Requirements:**
* User must type exact project name (case-sensitive)
* Delete button disabled until name matches
* Button labeled "Delete Project Forever" (very explicit)
* Shows loading state during deletion
* Redirects to dashboard after successful deletion
* Shows success notification: "Project 'Brand Design System' has been permanently deleted"
2. Figma Plugin
2.1 Plugin Architecture
Technical Setup:
Built with Figma Plugin API
UI: React 18 + Figma UI components
Storage: Figma's clientStorage API for caching and snapshot storage
Authentication: OAuth via browser redirect flow
Communication: REST API calls to Fragmento backend (Supabase)
Bundle Size: Optimized for fast loading (<500KB)
Plugin Manifest Configuration:
json
{
  "name": "Fragmento",
  "id": "fragmento-design-tokens",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "capabilities": [],
  "editorType": ["figma"],
  "permissions": [
    "currentuser"
  ],
  "networkAccess": {
    "allowedDomains": [
      "https://fragmento.app",
      "https://*.supabase.co"
    ]
  }
}
```

**Plugin Structure:**
```
figma-plugin/
├── src/
│   ├── plugin/
│   │   ├── controller.ts          # Main plugin logic
│   │   ├── figmaVariables.ts      # Figma Variables API wrapper
│   │   ├── compareSnapshots.ts    # Change detection logic
│   │   └── utils.ts               # Helper functions
│   ├── ui/
│   │   ├── App.tsx                # Root React component
│   │   ├── components/
│   │   │   ├── AuthScreen.tsx     # Authentication screen
│   │   │   ├── ProjectSelector.tsx # Org & project selection
│   │   │   ├── MainInterface.tsx   # Main plugin interface
│   │   │   ├── ImportModal.tsx     # Import variables modal
│   │   │   ├── PushModal.tsx       # Push changes modal
│   │   │   ├── TokenList.tsx       # Token list view
│   │   │   ├── ChangeItem.tsx      # Individual change display
│   │   │   └── SettingsModal.tsx   # Plugin settings
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          # Authentication hook
│   │   │   ├── useProject.ts       # Project data hook
│   │   │   └── useFigmaVariables.ts # Figma variables hook
│   │   ├── services/
│   │   │   ├── api.ts              # API client
│   │   │   └── storage.ts          # Local storage wrapper
│   │   └── styles/
│   │       └── globals.css         # Plugin styles
│   └── index.html                  # UI HTML entry point
├── manifest.json                   # Figma plugin manifest
├── package.json
├── vite.config.ts                  # Build configuration
└── tsconfig.json
```

**Key Technical Decisions:**

**Why clientStorage for Snapshots:**
* Persistent storage across plugin sessions
* No need for external database for snapshot data
* Faster than API calls for comparison operations
* Figma's built-in storage API (up to 1MB per file)

**Why Unidirectional Flow:**
* Eliminates complex sync conflict resolution
* Simpler state management in plugin
* Clearer mental model for users
* Better performance (no constant polling)

**Why OAuth Flow:**
* More secure than storing API keys in plugin
* Follows Figma plugin best practices
* Better user experience (one-time auth)
* Token refresh handled automatically

---

### 2.2 Simplified Plugin Workflow

**The Figma Plugin has THREE main actions:**

1. **Import** - One-time import of existing Figma variables into Fragmento
2. **Push** - Push Figma variable changes to Fragmento web app
3. **Pull** - Pull token list from Fragmento to view in plugin (read-only reference)

**Key Philosophy:**
* **Figma is NOT updated from web app** - This eliminates bidirectional sync conflicts
* **Designers work in Figma, push changes when ready** - Full control over timing
* **Developers work in code (from GitHub releases)** - Tokens flow through web app to GitHub
* **Web app is the coordination layer** between Figma and GitHub

**Why This Works:**
* Designers maintain full control over Figma files
* No unexpected changes to design files
* Clear ownership: Figma → Web App → GitHub
* Conflicts resolved in web app before GitHub release

---

### 2.3 Authentication Flow

**Initial Plugin Launch:**

**First Time User Experience:**

When user opens plugin for the first time, they see:
```
┌─────────────────────────────────────┐
│  Fragmento                          │
│  Design Tokens for shadcn/ui        │
├─────────────────────────────────────┤
│                                     │
│  ✨ Welcome!                         │
│                                     │
│  Connect your Fragmento account     │
│  to sync design tokens between      │
│  Figma and your codebase.           │
│                                     │
│  [Authenticate with Fragmento]      │
│                                     │
│  Don't have an account?             │
│  [Sign up on fragmento.app]         │
│                                     │
│  [Learn More]                       │
│                                     │
└─────────────────────────────────────┘
Authentication Screen Components:
Welcome Section:
Fragmento logo and tagline
Brief description of plugin purpose
Visual indication this is first-time setup
Primary Action Button:
"Authenticate with Fragmento" - large, prominent button
Opens browser for OAuth flow
Styled to match Figma's design system
Secondary Actions:
"Sign up on fragmento.app" link - for new users, opens registration page
"Learn More" link - opens plugin documentation
Visual Design:
Clean, minimal interface
Uses Figma's color scheme (grays, accent blue)
Icon/illustration showing Figma → Fragmento → Code flow
Loading states for all interactive elements
OAuth Authentication Process:
Step 1: User Clicks "Authenticate with Fragmento"
Plugin behavior:
typescript
// Plugin controller code
figma.ui.postMessage({
  type: 'open-auth-url',
  url: 'https://fragmento.app/figma/auth'
});
```

This opens the user's default browser to the auth page.

**Step 2: Browser Opens to fragmento.app/figma/auth**

User sees authorization page:
```
┌─────────────────────────────────────────┐
│ Fragmento                               │
│ [User Avatar]  jane@acme.com            │
├─────────────────────────────────────────┤
│                                         │
│ Authorize Figma Plugin                  │
│                                         │
│ The Fragmento Figma plugin is           │
│ requesting permission to:               │
│                                         │
│ ✓ Read Figma design variables           │
│   View variable names, values, and      │
│   collections in your Figma files       │
│                                         │
│ ✓ Push changes to Fragmento             │
│   Send variable updates to your         │
│   Fragmento projects                    │
│                                         │
│ ✓ View token data from Fragmento        │
│   Display your project tokens for       │
│   reference (read-only)                 │
│                                         │
│ This plugin will NOT:                   │
│ ✗ Modify your Figma files automatically │
│ ✗ Share your data with third parties    │
│ ✗ Access other Figma files              │
│                                         │
│ Signed in as: jane@acme.com             │
│ [Sign in as different user]             │
│                                         │
│ [Cancel]            [Authorize Plugin]  │
└─────────────────────────────────────────┘
```

**Authorization Page Components:**

**User Context:**
* Shows currently logged-in user
* Option to switch accounts if needed
* Links to terms of service and privacy policy

**Permissions List:**
* Clear explanation of each permission
* What plugin will do with access
* What plugin will NOT do (important for trust)

**Action Buttons:**
* Cancel - returns to Figma without authenticating
* Authorize - grants access and generates token

**Security Indicators:**
* HTTPS lock icon
* "Authorized by Anthropic" or security badge
* Last authorization date if re-authorizing

**Step 3: User Clicks "Authorize Plugin"**

Backend process:
1. Generate JWT auth token with 30-day expiry
2. Create plugin session record in database
3. Redirect back to Figma with token

Redirect URL format:
```
figma://auth-callback?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Step 4: Figma Receives Callback
Plugin receives message:
typescript
// Plugin controller code
window.addEventListener('message', (event) => {
  if (event.data.pluginMessage.type === 'auth-callback') {
    const token = event.data.pluginMessage.token;
    
    // Store token in clientStorage
    await figma.clientStorage.setAsync('auth_token', token);
    
    // Verify token and get user info
    const user = await verifyAndGetUser(token);
    
    // Show success state
    figma.ui.postMessage({
      type: 'auth-success',
      user: user
    });
  }
});
```

**Step 5: Success State in Plugin**

Plugin UI updates to show:
```
┌─────────────────────────────────────┐
│  ✓ Authentication Successful        │
│                                     │
│  Connected as: jane@acme.com        │
│  Organization: Acme Inc             │
│                                     │
│  Loading your projects...           │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│                                     │
└─────────────────────────────────────┘
```

After 1-2 seconds, transitions to project selection screen.

**Error Handling:**

**Network Error:**
```
┌─────────────────────────────────────┐
│  ❌ Connection Failed                │
│                                     │
│  Unable to connect to Fragmento.    │
│                                     │
│  Please check:                      │
│  • Your internet connection         │
│  • Figma network permissions        │
│                                     │
│  [Retry]  [Get Help]                │
│                                     │
└─────────────────────────────────────┘
```

**Authorization Declined:**
```
┌─────────────────────────────────────┐
│  Authorization Cancelled            │
│                                     │
│  You declined the authorization     │
│  request. The plugin needs access   │
│  to sync your tokens.               │
│                                     │
│  Without authorization, you cannot: │
│  • Import Figma variables           │
│  • Push changes to Fragmento        │
│  • View your projects               │
│                                     │
│  [Try Again]  [Learn Why]           │
│                                     │
└─────────────────────────────────────┘
```

**Token Expired:**
```
┌─────────────────────────────────────┐
│  ⚠️ Session Expired                  │
│                                     │
│  Your authentication has expired    │
│  (tokens last 30 days).             │
│                                     │
│  Please sign in again to continue   │
│  using the plugin.                  │
│                                     │
│  [Sign In Again]                    │
│                                     │
└─────────────────────────────────────┘
Token Storage & Security:
What's Stored in clientStorage:
typescript
{
  auth_token: string,           // JWT token
  token_expiry: number,          // Unix timestamp
  user_id: string,               // Fragmento user ID
  user_email: string,            // For display
  last_org_id: string,          // Last selected org
  last_project_id: string       // Last selected project
}
```

**Security Measures:**
* Token stored in Figma's encrypted clientStorage (file-scoped)
* Token validated on every API request
* Token automatically refreshed if near expiry
* Token invalidated on sign out
* No sensitive data stored locally beyond token

**Re-Authentication Flow:**

For returning users who are already authenticated:
```
┌─────────────────────────────────────┐
│  Fragmento                          │
├─────────────────────────────────────┤
│                                     │
│  Welcome back, Jane! 👋             │
│                                     │
│  Last used:                         │
│  Brand Design System                │
│  Acme Inc                           │
│                                     │
│  [Continue with This Project]       │
│                                     │
│  [Switch Project]                   │
│  [Sign Out]                         │
│                                     │
└─────────────────────────────────────┘
```

**Quick Resume Features:**
* Remembers last used project
* One-click to resume where left off
* Option to switch projects without re-auth
* Sign out option always available

---

### 2.4 Organization & Project Selection

**After successful authentication, user needs to select project:**

**Organization & Project Selector Screen:**
```
┌─────────────────────────────────────────┐
│ Fragmento                     [⚙️]      │
├─────────────────────────────────────────┤
│                                         │
│ Select Project                          │
│                                         │
│ Organization                            │
│ [Acme Inc                      ▼]       │
│                                         │
│ Project                                 │
│ [Brand Design System           ▼]       │
│ (Can Edit)                              │
│                                         │
│ Description:                            │
│ Design tokens for brand refresh         │
│ across all products                     │
│                                         │
│ Token Stats:                            │
│ • 53 tokens across 3 sets               │
│ • Last release: v1.3.0 (2 hours ago)    │
│ • 5 pending changes                     │
│                                         │
│ [Load Project]                          │
│                                         │
└─────────────────────────────────────────┘
```

**Organization Dropdown Components:**

**Dropdown Structure:**
```
Organization ▼
├─ Acme Inc (Owner)
│  3 projects
│
├─ Personal Projects (You)
│  1 project
│
└─ Design Agency LLC (Member)
   2 projects
```

**Dropdown Features:**
* Shows all organizations user belongs to
* Displays user's role in each org (Owner/Admin/Member)
* Shows project count for each org
* Icons indicate org type (company/personal)
* Search filter appears if more than 5 orgs
* Most recently used org shown first

**Project Dropdown Components:**

**Dropdown Structure (when org selected):**
```
Project ▼
├─ Brand Design System (Can Edit)
│  53 tokens · v1.3.0 · 2 hours ago
│
├─ Mobile App Tokens (View Only)
│  32 tokens · v2.1.0 · 1 day ago
│
└─ Marketing Site DS (Can Edit)
   18 tokens · v1.0.0 · 1 week ago
```

**Dropdown Features:**
* Shows all projects in selected organization
* Access level badge (View Only / Can Edit)
* Token count and latest version
* Last activity timestamp
* Search filter if more than 5 projects
* Recently accessed projects shown first
* Disabled projects show "Archived" badge

**Project Preview Card:**

When project selected in dropdown, shows preview:
```
┌─────────────────────────────────────────┐
│ Brand Design System                     │
│ Can Edit                                │
├─────────────────────────────────────────┤
│                                         │
│ Design tokens for brand refresh         │
│ across all products                     │
│                                         │
│ 📊 Token Stats:                         │
│ • 53 tokens across 3 sets               │
│ • Global: 27 · Semantic: 18 ·Component:8│
│                                         │
│ 📦 Latest Release:                      │
│ • v1.3.0 released 2 hours ago           │
│ • By Jane Doe                           │
│                                         │
│ ⚠️ Pending Changes:                     │
│ • 5 unreleased changes                  │
│ • 3 from Web App, 2 from Figma          │
│                                         │
└─────────────────────────────────────────┘
```

**Preview Card Information:**
* Project description
* Token statistics by set
* Latest release info
* Pending changes alert
* Team size indicator
* Last modified timestamp

**Load Project Process:**

**Click "Load Project" button:**

**Step 1: Loading State**
```
┌─────────────────────────────────────────┐
│ Loading Brand Design System...          │
│                                         │
│ ✓ Fetching project data                 │
│ ✓ Loading token sets                    │
│ 🔄 Loading tokens (53 total)            │
│ ⏳ Reading Figma variables               │
│ ⏳ Preparing interface                   │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│                                         │
└─────────────────────────────────────────┘
```

**Step 2: Data Fetched**
* Project metadata retrieved from API
* All tokens fetched for reference
* Token sets and hierarchy loaded
* Last push snapshot retrieved (if exists)
* User's access level confirmed

**Step 3: Figma Variables Scanned**
* Read all variable collections in current file
* Read all variables in those collections
* Build structure of current Figma state
* Compare with last push snapshot (if exists)
* Detect changes since last push

**Step 4: Interface Ready**

Transitions to main plugin interface with all data loaded.

**Error States:**

**No Access:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Access Denied                         │
│                                         │
│ You don't have access to this project.  │
│                                         │
│ Contact the project owner (Jane Doe)    │
│ to request access.                      │
│                                         │
│ [Select Different Project]              │
│                                         │
└─────────────────────────────────────────┘
```

**Project Archived:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Project Archived                      │
│                                         │
│ This project has been archived and      │
│ is read-only.                           │
│                                         │
│ You can view tokens but cannot push     │
│ changes.                                │
│                                         │
│ [Continue (Read-Only)]  [Go Back]       │
│                                         │
└─────────────────────────────────────────┘
```

**Network Error:**
```
┌─────────────────────────────────────────┐
│ ❌ Failed to Load Project                │
│                                         │
│ Could not connect to Fragmento.         │
│                                         │
│ Error: Network request timeout          │
│                                         │
│ [Retry]  [Go Back]  [Get Help]          │
│                                         │
└─────────────────────────────────────────┘
```

**Quick Switch Feature:**

Once a project is loaded, user can quickly switch without going back:
```
Top bar shows:
┌─────────────────────────────────────────┐
│ Acme Inc › Brand Design System ▼  [⚙️]  │
└─────────────────────────────────────────┘

Clicking dropdown shows:
┌─────────────────────────────────────────┐
│ Current Project                         │
│ › Brand Design System                   │
│                                         │
│ Recent Projects                         │
│ • Mobile App Tokens                     │
│ • Marketing Site DS                     │
│                                         │
│ [Browse All Projects]                   │
│ [Switch Organization]                   │
└─────────────────────────────────────────┘
```

---

### 2.5 Main Plugin Interface

**After project loaded successfully:**

**Main Interface Layout:**
```
┌─────────────────────────────────────────┐
│ Fragmento                     [⚙️] [↻]  │
│ Acme Inc › Brand Design System ▼        │
├─────────────────────────────────────────┤
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 📊 Current State                  │   │
│ │                                   │   │
│ │ Figma Variables: 45               │   │
│ │ ├─ Primitives: 25                 │   │
│ │ ├─ Semantic: 15                   │   │
│ │ └─ Components: 5                  │   │
│ │                                   │   │
│ │ Fragmento Tokens: 53              │   │
│ │ ├─ From Figma: 45                 │   │
│ │ └─ From Web App: 8                │   │
│ │                                   │   │
│ │ ⚠️ Status: 5 unpushed changes      │   │
│ │                                   │   │
│ └───────────────────────────────────┘   │
│                                         │
│ Actions                                 │
│                                         │
│ [📥 Import Figma Variables]             │
│ Import existing variables (one-time)    │
│                                         │
│ [↑ Push Changes to Fragmento]           │
│ Send your Figma changes (5 detected)    │
│                                         │
│ [↓ Pull Token List (Read-Only)]         │
│ View all project tokens for reference   │
│                                         │
├─────────────────────────────────────────┤
│ Recent Activity                         │
│                                         │
│ • v1.3.0 released 2 hours ago           │
│   by Jane Doe                           │
│                                         │
│ • 5 changes pushed from Figma           │
│   by Sarah Designer                     │
│   1 hour ago                            │
│                                         │
│ • 3 tokens added in web app             │
│   by John Developer                     │
│   3 hours ago                           │
│                                         │
│ [View All in Fragmento]                 │
│                                         │
└─────────────────────────────────────────┘
```

**Interface Header Components:**

**Top Navigation Bar:**
* **Fragmento Logo:** Clickable, returns to project selection
* **Project Breadcrumb:** "Acme Inc › Brand Design System ▼" - dropdown for quick switch
* **Refresh Icon (↻):** Manually refresh data from Fragmento
* **Settings Icon (⚙️):** Opens plugin settings modal

**Current State Card:**

**Figma Variables Section:**
* **Count:** Total variables in current Figma file
* **Breakdown:** Shows count by collection:
  - Primitives collection → maps to global set
  - Semantic collection → maps to semantic set
  - Components collection → maps to component set
* **Empty State:** If no variables: "No variables in this file. Create variables in Figma to get started."

**Fragmento Tokens Section:**
* **Total Count:** All tokens in selected project
* **Source Breakdown:**
  - From Figma: Tokens originally pushed from Figma
  - From Web App: Tokens created in web interface
* **Sync Indicator:** Shows if counts match expectations

**Status Indicator:**
* **Green ✓ "All synced":** No unpushed changes detected
* **Yellow ⚠️ "N unpushed changes":** Changes detected, ready to push
* **Red ❌ "Issues detected":** Problems that need attention
* **Blue ℹ️ "Never pushed":** No push history for this file

**Action Buttons:**

**Import Figma Variables Button:**
* **Label:** "📥 Import Figma Variables"
* **Subtitle:** "Import existing variables (one-time)"
* **Style:** Secondary button
* **State:** 
  - Enabled if variables exist in file
  - Disabled if already imported (greyed out with "Already imported" text)
  - Hidden if user has View Only access
* **Badge:** "One-time" indicator
* **Tooltip:** Explains this is for initial import only

**Push Changes Button:**
* **Label:** "↑ Push Changes to Fragmento"
* **Subtitle:** Shows change count "Send your Figma changes (5 detected)" or "No changes to push"
* **Style:** Primary button (blue/purple)
* **State:**
  - Enabled if changes detected
  - Disabled if no changes (greyed out)
  - Disabled if View Only access (with tooltip explaining why)
* **Badge:** Red dot with number if changes exist
* **Highlight:** Pulses gently when unpushed changes exist

**Pull Token List Button:**
* **Label:** "↓ Pull Token List (Read-Only)"
* **Subtitle:** "View all project tokens for reference"
* **Style:** Secondary button
* **State:** Always enabled
* **Icon:** Eye icon indicating view-only
* **Tooltip:** "This will not modify your Figma file"

**Recent Activity Feed:**

**Activity List Structure:**
* Shows last 3-5 activities across all sources
* Chronological order (most recent first)
* Each activity shows:
  - Activity type icon
  - Description
  - User who performed action (with avatar)
  - Relative timestamp

**Activity Types Shown:**
* **Release Published:** "v1.3.0 released 2 hours ago by Jane Doe"
* **Figma Push:** "5 changes pushed from Figma by Sarah Designer"
* **Web App Changes:** "3 tokens added in web app by John Developer"
* **Team Member Added:** "Mike joined the project"
* **Integration Connected:** "GitHub connected to acme/design-tokens"

**Activity Item Components:**
* **Icon:** Type-specific (📦 release, 🎨 Figma, 🌐 web app, 👤 team, 🔗 integration)
* **Text:** Clear description of what happened
* **User Info:** Name with avatar thumbnail
* **Timestamp:** Relative time (e.g., "2 hours ago")
* **Click Behavior:** Some items clickable to see more details

**View All Link:**
* Opens Fragmento web app in browser
* Links directly to project's versions page
* Opens in new tab/window

**Empty States:**

**No Variables in Figma:**
```
┌───────────────────────────────────┐
│ 📊 Current State                  │
│                                   │
│ No Figma variables found          │
│                                   │
│ Create variables in Figma to      │
│ start using Fragmento.            │
│                                   │
│ [Learn About Variables]           │
│                                   │
└───────────────────────────────────┘
```

**No Recent Activity:**
```
Recent Activity

No activity yet in this project.

Actions you take will appear here.
```

**View Only Access:**
```
┌─────────────────────────────────────────┐
│ 👁️ View Only Access                      │
│                                         │
│ You can view tokens but cannot push     │
│ changes to this project.                │
│                                         │
│ Contact Jane Doe (owner) to request     │
│ edit access.                            │
│                                         │
└─────────────────────────────────────────┘

All action buttons disabled with tooltip explaining access level.
```

**Keyboard Shortcuts:**

Available shortcuts (shown in settings):
* **Cmd/Ctrl + R:** Refresh data
* **Cmd/Ctrl + I:** Import variables
* **Cmd/Ctrl + P:** Push changes
* **Cmd/Ctrl + L:** Pull token list
* **Cmd/Ctrl + ,:** Open settings
* **Esc:** Close any modal

**Status Bar (Bottom):**
```
┌─────────────────────────────────────────┐
│ Last synced: 5 minutes ago   [Refresh]  │
└─────────────────────────────────────────┘
