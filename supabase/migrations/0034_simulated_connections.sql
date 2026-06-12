-- Migration 0034: 'simulated' connection status.
-- Simulated connectors generate realistic, clearly-labeled synthetic
-- source data matched to each pull instruction — workflows consume
-- source-shaped data end to end before any real integration exists.

alter table workflow_data_sources
  drop constraint if exists workflow_data_sources_connection_status_check;

alter table workflow_data_sources
  add constraint workflow_data_sources_connection_status_check
  check (connection_status in ('placeholder', 'simulated', 'connected', 'error'));
