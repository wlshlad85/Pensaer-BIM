/**
 * IFC Parser Service
 *
 * @deprecated Import from './ifc' instead
 * This file is kept for backward compatibility.
 */

export {
  IfcParser,
  getIfcParser,
  parseIfcFile,
  parseIfcString,
  exportToIfc,
  downloadIfcFile,
} from "./ifc";

export type {
  IfcImportResult,
  IfcImportStats,
  IfcExportResult,
  IfcExportStats,
  IfcExportOptions,
} from "./ifc";
