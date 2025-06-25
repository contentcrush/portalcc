# replit.md

## Overview

This is a comprehensive project management system built for content production companies, called "Content Crush". It's a full-stack web application that manages projects, tasks, clients, finances, calendar events, and team collaboration. The system uses a modern tech stack with React frontend, Express backend, PostgreSQL database, and real-time features via WebSockets.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Real-time**: Native WebSockets and Socket.IO for live updates
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: JWT tokens with refresh token rotation
- **File Upload**: Multer with Sharp for image processing
- **Real-time**: WebSocket server for live updates
- **Background Jobs**: Automated project status tracking and calendar sync

### Key Components

1. **Authentication System**
   - JWT-based authentication with refresh tokens
   - Role-based access control (admin, manager, editor, viewer)
   - Session management with automatic token refresh
   - Secure password hashing with bcrypt

2. **Project Management**
   - Project lifecycle tracking with status automation
   - Kanban board and Gantt chart views
   - Project stages and milestone tracking
   - Special status handling (delayed, paused, canceled)
   - **FIXED**: Progress calculation based on task completion

3. **Task Management**
   - Task assignment and tracking
   - Priority levels and due date management
   - Real-time collaborative comments
   - File attachments with image processing
   - Automated deadline alerts

4. **Client Relationship Management**
   - Client profiles with contact information
   - Interaction history tracking
   - Project association and billing
   - Document management per client

5. **Financial Management**
   - Invoice and payment tracking
   - Expense management with receipt uploads
   - Financial document audit trail
   - Budget vs actual reporting
   - Automated payment reminders

6. **Calendar Integration**
   - Project deadlines and milestones
   - Financial due dates
   - Team scheduling
   - FullCalendar integration with multiple views

7. **File Management**
   - Centralized file storage system
   - Image optimization and processing
   - Organized by entity type (projects, tasks, clients)
   - File type validation and security

## Data Flow

1. **Client Request Flow**:
   - React components make API calls via TanStack Query
   - Requests include JWT authentication headers
   - Express routes validate permissions and process requests
   - Drizzle ORM handles database operations
   - Results are cached and synchronized across components

2. **Real-time Updates**:
   - WebSocket connections established on app load
   - Server broadcasts changes to relevant clients
   - Frontend invalidates cached queries and updates UI
   - Optimistic updates for better user experience

3. **File Upload Flow**:
   - Files uploaded to temporary directory via Multer
   - Image files processed with Sharp for optimization
   - Files moved to organized directory structure
   - Database records created with file metadata

## External Dependencies

### Core Framework Dependencies
- **Database**: PostgreSQL 16 via Neon serverless
- **Node.js**: Version 20 with ES modules
- **Authentication**: JWT with refresh token strategy

### Key Libraries
- **Frontend**: React, TanStack Query, Wouter, Tailwind CSS, Radix UI
- **Backend**: Express, Drizzle ORM, Multer, Sharp, bcrypt
- **Calendar**: FullCalendar with React integration
- **Charts**: Nivo for data visualization
- **Date Handling**: date-fns with timezone support
- **Real-time**: Socket.IO and native WebSockets

### Development Tools
- **TypeScript**: Full type safety across stack
- **Vite**: Development server and build tool
- **ESBuild**: Production backend bundling
- **Drizzle Kit**: Database migrations and schema management

## Deployment Strategy

### Development Environment
- **Runtime**: Replit with Node.js 20, Web, and PostgreSQL modules
- **Hot Reload**: Vite dev server with HMR
- **Database**: PostgreSQL instance with automatic migrations
- **File Storage**: Local file system with organized directories

### Production Build
- **Frontend**: Vite builds to `dist/public` directory
- **Backend**: ESBuild bundles server to `dist/index.js`
- **Database**: Drizzle migrations applied automatically
- **Static Files**: Served by Express in production

### Environment Configuration
- **Timezone**: UTC for all server operations
- **Database**: Connection pooling with timeout handling
- **File Uploads**: 50MB limit with image optimization
- **Security**: CORS, authentication middleware, input validation

## Recent Changes

### June 25, 2025 - Nota Fiscal Download System Fixed
1. **RESOLVED**: Nota fiscal download failures due to file path inconsistencies
   - Implemented robust recursive file search algorithm
   - Fixed orphaned database records (removed 10 invalid file references)
   - Corrected file paths for documents 19-22 in database
   - Added intelligent NFSe number matching for file discovery

2. **ENHANCED**: File integrity management system
   - Created FileIntegrityService for automatic validation
   - Removed references to non-existent files (documents 23,24,26,29,30,31,40,43,44,50)
   - Corrected image file references for documents 25,27,28
   - Removed orphaned physical file (document 18 duplicate)
   - Implemented comprehensive audit of all financial document attachments

3. **IMPROVED**: Download system resilience and upload integrity
   - Added fallback search mechanism across entire uploads directory
   - Enhanced error handling and logging for download operations
   - Fixed content-type headers for different file formats
   - Implemented atomic upload operations with rollback capability
   - Added file integrity validation and monitoring system
   - Achieved 100% consistency between database and file system

4. **ROOT CAUSE ANALYSIS**: Identified 5 structural issues causing file loss
   - Lack of atomic transactions between filesystem and database operations
   - Absence of rollback mechanisms when upload operations fail
   - Multiple uploads of same NFSe without duplicate detection
   - Inconsistent file naming between database records and filesystem
   - Missing post-upload validation and integrity checks

### June 20, 2025 - Critical Fixes Completed
1. **FIXED**: Progress calculation system completely restored
   - All 27 projects now show correct progress percentages based on status
   - Added automatic progress calculation when project status changes
   - Progress mapping: Proposta (14%), Proposta Aceita (29%), Produção (57%), Pós-revisão (71%), Entregue (86%), Concluído (100%)

2. **FIXED**: Timeline transition validation made flexible
   - Expanded allowed status transitions in PROJECT_STATUS_CONFIG
   - Added special rules for fast-track transitions (jump to entregue/concluido)
   - Added reset transitions (back to proposta from any status)
   - Removed overly restrictive validation that blocked normal workflow

3. **FIXED**: Dual-status system architecture
   - Main status: workflow progression (proposta → concluido)
   - Special status: overlay conditions (delayed, paused, canceled, none)
   - Automation system correctly uses special_status field

4. **RESOLVED**: White screen bug from invalid status handling
   - Added graceful error handling for unrecognized project statuses
   - System logs warnings but continues operation

5. **FIXED**: Financial document creation validation system
   - Resolved all TypeScript validation errors in server routes
   - Updated frontend to use correct field names (issue_date instead of creation_date)
   - Added proper created_by field handling throughout the system
   - Removed invalid database field references causing validation failures
   - Comprehensive testing confirmed all financial document operations work correctly

### System Status
- **Projects**: 27 total, all with correct progress calculation
- **Status Distribution**: 12 completed, 6 delivered, 3 in production, etc.
- **Database**: All migrations applied, data integrity verified
- **Timeline Transitions**: Now flexible and user-friendly

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

- June 20, 2025: Initial setup and critical system fixes completed