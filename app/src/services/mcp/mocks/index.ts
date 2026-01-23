/**
 * MCP Mock Responses Index
 *
 * Re-exports all mock data fixtures for MCP tools.
 */

// Geometry mocks
export {
  mockCreateWall,
  mockCreateFloor,
  mockCreateRoom,
  mockCreateRoof,
  mockCreateOpening,
  mockPlaceDoor,
  mockPlaceWindow,
  mockComputeMesh,
} from "./geometryMocks";

// Query mocks
export {
  mockListElements,
  mockGetElement,
  mockDeleteElement,
  mockModifyElement,
  mockGetStateSummary,
} from "./queryMocks";

// Spatial mocks
export {
  mockDetectRooms,
  mockComputeAdjacency,
  mockFindNearest,
  mockComputeArea,
  mockCheckClearance,
  mockAnalyzeCirculation,
  mockPointInPolygon,
  mockAnalyzeTopology,
} from "./spatialMocks";

// Validation mocks
export { mockDetectClashes, mockDetectClashesBetweenSets } from "./validationMocks";
