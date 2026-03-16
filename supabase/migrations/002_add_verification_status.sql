-- Migration: 002_add_verification_status.sql
-- Adds verification_status to opportunities table

alter table opportunities
  add column if not exists verification_status text
    not null default 'unverified'
    check (verification_status in ('unverified', 'source_verified', 'manually_reviewed'));
