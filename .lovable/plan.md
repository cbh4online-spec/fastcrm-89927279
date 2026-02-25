

# Passo 5 — Visual Data Model Page

## Overview

Create a read-only visual map at `/platform/data` that renders each custom object as a card node and draws edges for existing relationships between them. Uses `@xyflow/react` (already installed) with auto-layout. Non-interactive v1 — no drag-to-create, no editing. Clean, visual, informative.

## Current State

- `@xyflow/react` is already installed and used in `FlowBuilderCanvas.tsx` for conversational flows
- `DataModelPage.tsx` exists at `/settings/data-model` as the interactive builder
- `RelationshipSchemaBuilder` queries `object_relationships` to derive which object types are connected
- `useCustomObjects()` returns all custom objects with icon, color, name
- `OBJECT_REGISTRY` has core objects (contacts, companies, deals)

## Plan

### 1. New Page: `src/pages/VisualDataModelPage.tsx`

Full-page with `DashboardLayout`. Contains:
- Header: "Modelo de Dados" title + subtitle
- Link to `/settings/data-model` ("Editar modelo")
- `ReactFlow` canvas filling remaining height
- `Background` (dots pattern) + `Controls` (zoom)
- Read-only: `nodesDraggable={true}` but `nodesConnectable={false}`, `elementsSelectable={false}`

Data loading:
- Fetch all custom objects via `useCustomObjects()`
- Include core objects from `OBJECT_REGISTRY` as additional nodes
- Query `object_relationships` grouped by `(source_object_id, target_object_id)` to derive edges with count labels
- Auto-layout nodes in a grid (3 columns, spaced 300px x 200px)

### 2. New Component: `src/components/objects/DataModelNode.tsx`

Custom `@xyflow/react` node rendered as a card:
- Object icon (colored) + name
- Field count badge
- Subtle border using the object's color
- `Handle` on all 4 sides for edge connections
- Compact size (~200px wide)

### 3. Edge styling

- Smoothstep edges with animated dash
- Label showing relationship count (e.g., "3 registos")
- Muted color, subtle

### 4. Route Registration

Add `/platform/data` route in `App.tsx`.

## File Summary

| File | Action | Description |
|---|---|---|
| `src/pages/VisualDataModelPage.tsx` | **NEW** | ReactFlow canvas with object cards + relationship edges |
| `src/components/objects/DataModelNode.tsx` | **NEW** | Custom node component for object cards |
| `src/App.tsx` | **EDIT** | Add route `/platform/data` |

## Criteria

- All custom objects appear as cards
- Core objects (Contacts, Companies, Deals) appear as cards
- Relationship lines connect objects that have linked records
- Clean, non-technical visual
- Navigable from settings or sidebar

