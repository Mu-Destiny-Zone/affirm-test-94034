# Tests Mu Destiny Zone - Test Management System

## Overview

Tests Mu Destiny Zone is a comprehensive test management system built for collaborative software testing and quality assurance. The application enables teams to create, execute, and track tests, report bugs, submit feature suggestions, and analyze team performance through detailed reports. It supports multi-organization workflows with role-based access control and includes features like test assignments, execution tracking, voting systems, and real-time notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, built using Vite for fast development and optimized production builds.

**UI Component System**: The application uses shadcn/ui components built on Radix UI primitives, providing accessible and customizable UI elements. TailwindCSS handles styling with a custom design system featuring Inter font for text and JetBrains Mono for code.

**State Management**: 
- React Query (TanStack Query) manages server state with caching, background refetching, and optimistic updates
- React Context API handles cross-cutting concerns (authentication, organization context)
- Local component state for UI-specific logic

**Routing**: React Router v6 provides client-side routing with nested routes and protected route logic. A 404.html fallback ensures deep-link support on static hosts.

**Internationalization**: i18next provides multi-language support (English and Bulgarian) with user preferences stored in profiles.

**Progressive Web App (PWA)**: Service worker implementation enables offline caching and app installation on mobile devices, configured via manifest.json.

### Authentication & Authorization

**Authentication Provider**: Supabase Auth handles user authentication with email/password and Google OAuth integration.

**Role-Based Access Control**: Three-tier permission system:
- **Organization Level**: admin, manager, tester, viewer roles control access to organization resources
- **Ownership**: Users can edit/delete their own content regardless of role
- **Feature-Specific**: Certain actions (like deleting tests, managing users) require admin/manager roles

**Session Management**: AuthContext provider maintains user session state, profile data, and provides authentication methods throughout the application.

### Data Layer

**Database**: Supabase (PostgreSQL) serves as the backend database with Row Level Security (RLS) policies enforcing access control.

**ORM**: Drizzle ORM (configured for Neon serverless) provides type-safe database queries and migrations, though the application primarily uses Supabase client for queries.

**Schema Design**:
- **Multi-tenancy**: Organization-based data isolation with `org_id` foreign keys
- **Soft Deletes**: `deleted_at` timestamps enable data recovery and audit trails
- **Relational Integrity**: Foreign key constraints maintain data consistency
- **JSONB Storage**: Complex data structures (test steps, bug reproduction steps, step results) stored as JSON

**Key Entities**:
- `profiles`: User accounts with display names, avatars, locale, and theme preferences
- `orgs`: Organizations with slugs for URL routing
- `org_members`: Junction table linking users to organizations with roles
- `tests`: Test cases with steps, priority, and status
- `test_assignments`: Tracks test execution assignments to users
- `bug_reports`: Bug tracking with severity, status, and reproduction steps
- `suggestions`: Feature requests with impact levels and voting
- `votes`: Community voting on bugs and suggestions
- `comments`: Threaded discussions on tests, bugs, and suggestions
- `notifications`: Real-time user notifications

### Feature Modules

**Test Management**:
- Create tests with multiple steps, expected results, and priority levels
- Assign tests to team members with due dates and state tracking
- Execute tests with pass/fail/skip results per step
- View execution history and statistics
- Copy tests across organizations
- Filter and search tests by status, priority, and assignments

**Bug Reporting**:
- Report bugs with severity levels (low, medium, high, critical)
- Link bugs to specific tests and test executions
- Track reproduction steps and attach YouTube video links
- Assign bugs to team members via detail dialog (assignee selection in BugDetailDialog)
- Notifications sent when bugs are assigned to team members
- Community voting on bug priority
- Status workflow: new → triaged → in_progress → fixed/won't_fix/duplicate → closed

**Suggestions System**:
- Submit feature suggestions with impact assessment
- Assign suggestions to team members via detail dialog (assignee selection in SuggestionDetailDialog)
- Notifications sent when suggestions are assigned to team members
- Community voting (upvote/downvote) influences prioritization
- Status workflow: new → consider → planned → done/rejected
- Tag-based categorization
- Link suggestions to specific tests

**Reports & Analytics**:
- Organization-wide statistics (members, projects, growth metrics)
- User activity tracking and leaderboards
- Test execution statistics with pass/fail rates
- Bug severity distribution and resolution times
- Visual charts using Recharts (bar, pie, line, radar charts)
- Individual user performance metrics
- Data reset functionality for admins

**Leaderboard**:
- Individual user statistics visible to all organization members
- Test executions (assignments with completed step results)
- Total assignments, bugs reported, suggestions submitted, and comments
- Activity score calculation: (executions × 3) + assignments + comments
- Top 3 podium display for gamification
- Comprehensive statistics table with last active dates
- Located under Documentation section in navigation
- Fully localized (English and Bulgarian)

**Command Palette**: Global keyboard shortcut (Cmd/Ctrl+K) provides quick navigation to any page or feature.

**Bulk Operations**: Multi-select functionality for batch actions on tests, bugs, and suggestions.

**Collaboration Features**:
- Threaded comments on all entities
- @mention support in comments
- Real-time notifications via Supabase subscriptions (including assignment notifications for bugs and suggestions)
- Activity feeds showing recent team actions
- Assignment tracking with state-based notification logic to prevent duplicate notifications

### Organization Management

**Multi-Organization Support**: Users can belong to multiple organizations with different roles in each.

**Organization Switching**: Header dropdown allows switching between organizations with persistent preference.

**Access Control**: NoOrganizationAccess component displays a holding screen for users not yet assigned to any organization.

**Admin Capabilities**:
- Create new organizations
- Manage organization members and roles
- Transfer organization ownership
- View and reset organization analytics

### UI/UX Patterns

**Design System**: Modern, professional aesthetic with deep blue primary colors, semantic status colors, and careful use of shadows and gradients for depth.

**Responsive Layout**: 
- Sidebar navigation with collapsible states
- Mobile-optimized views using shadcn's Sidebar component
- Card-based layouts for content display
- Adaptive grid systems for different screen sizes

**Loading States**: 
- Skeleton loaders for content fetching
- Spinner indicators for actions
- Optimistic updates for instant feedback

**Error Handling**: Toast notifications provide user feedback for success/error states with actionable messages.

**Accessibility**: Radix UI primitives ensure ARIA compliance, keyboard navigation, and screen reader support.

### Performance Optimizations

**Code Splitting**: Vite's dynamic imports enable route-based code splitting.

**Query Optimization**: React Query caching reduces redundant network requests with configurable stale times.

**Image Optimization**: Avatar uploads to Supabase Storage with automatic URL generation.

**Bundle Size**: Tree-shaking and production builds minimize JavaScript payload.

### Development Workflow

**Type Safety**: TypeScript with strict mode disabled (`noImplicitAny: false`) balances type safety with development speed.

**Linting**: ESLint with TypeScript rules enforces code quality, though unused variable warnings are disabled.

**Build Modes**: Separate development and production builds via `npm run build` and `npm run build:dev`.

**Development Server**: Vite dev server with hot module replacement runs on port 5000, accessible from any host.

## External Dependencies

### Backend as a Service

**Supabase** (`@supabase/supabase-js`): 
- PostgreSQL database hosting with automatic API generation
- Row Level Security for access control
- Real-time subscriptions for live updates
- Authentication with email/password and OAuth providers
- Storage for user avatars and file uploads
- Edge functions for serverless operations

**Neon** (`@neondatabase/serverless`): 
- Serverless PostgreSQL provider (alternative to Supabase Postgres)
- WebSocket-based connections for edge deployments
- Configured with Drizzle ORM though primarily using Supabase client

### UI Component Libraries

**Radix UI**: Headless component primitives providing accessible foundations for:
- Dialogs, dropdowns, popovers, tooltips
- Form controls (checkboxes, radio groups, selects, switches)
- Navigation (accordion, tabs, menubar)
- Feedback (alerts, toasts, progress)

**shadcn/ui**: Pre-styled components built on Radix UI with Tailwind CSS for rapid development.

**Lucide React** (`lucide-react`): Icon library providing consistent, customizable SVG icons.

### Form Management

**React Hook Form** (`react-hook-form`): Performant form state management with validation.

**Zod** (via `@hookform/resolvers`): Schema validation for form inputs.

### Data Visualization

**Recharts**: Declarative charting library for bar, pie, line, and radar charts in the reports module.

### Internationalization

**i18next** (`i18next`, `react-i18next`): Translation framework supporting English and Bulgarian with user preference storage.

### Theme Management

**next-themes**: Dark/light/system theme switching with persistence.

### Date Utilities

**date-fns**: Modern date manipulation and formatting library.

### Styling

**TailwindCSS**: Utility-first CSS framework with custom design tokens.

**class-variance-authority** (`cva`): Variant-based component styling.

**clsx** & **tailwind-merge**: Conditional className composition and conflict resolution.

### Developer Tools

**Vite**: Build tool providing fast development server and optimized production builds.

**TypeScript**: Type safety across the codebase.

**ESLint**: Code quality enforcement.

**lovable-tagger**: Development-mode component tagging (Lovable platform integration).

### Third-Party Integrations

**Google OAuth**: Authentication provider via Supabase Auth.

**YouTube**: Video embedding for bug reproduction videos (URL storage only).