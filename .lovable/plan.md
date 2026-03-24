

# Add Property Access Sharing (Assign Properties to Users)

## Current State
Properties have a single `user_id` owner. There is no mechanism to share or assign property access to other users like Lauren without transferring full ownership.

## Proposed Solution
Add a **property_access** table (many-to-many) so multiple users can view/manage the same properties, plus an admin UI to assign properties to users.

## Architecture

```text
properties (existing)
  └── user_id = owner

property_access (new)
  ├── property_id (uuid → properties.id)
  ├── user_id (uuid, the granted user)
  ├── access_level ('viewer' | 'manager')
  ├── granted_by (uuid)
  └── created_at
```

## Changes

### 1. Database Migration
- Create `property_access` table with RLS policies
- Users can see properties they own OR have been granted access to
- Update the RLS policy on `properties` to include shared access:
  `auth.uid() = user_id OR EXISTS (SELECT 1 FROM property_access WHERE ...)`
- Security definer function `has_property_access(user_id, property_id)` to avoid RLS recursion

### 2. Admin Panel -- New "Assign Properties" UI
- Add a section in the Admin Panel (or a per-user expandable row) to:
  - Search for a user by email/name
  - See all properties in the system
  - Check/uncheck properties to grant access
  - Choose access level (viewer vs manager)
- Super admins only

### 3. Update Property Queries
- Update `useProperties` hook and `propertyService` to fetch properties where `user_id = auth.uid() OR property_access` exists
- Shared properties show a badge indicating "Shared with you"

### 4. Update SMS Concierge RLS
- The `sms_conversations` and `sms_conversation_messages` RLS policies reference `properties.user_id`. These need updating to also allow shared-access users to view conversations for properties they manage.

## What This Enables
- As a super admin, you go to Admin Panel > Users, find Lauren, and assign her specific properties
- Lauren sees those properties in her dashboard alongside any she created herself
- No data duplication -- same property record, shared access

