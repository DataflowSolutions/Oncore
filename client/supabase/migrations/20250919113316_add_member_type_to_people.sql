-- Add member_type column to people table for proper team categorization

-- Create enum for member types
create type member_type as enum ('Artist', 'Crew', 'Agent', 'Manager');

-- Add member_type column to people table
alter table people 
add column member_type member_type;