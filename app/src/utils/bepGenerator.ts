/**
 * Pensaer BIM Platform - BEP Generator
 *
 * Auto-generates a BIM Execution Plan (BEP) template
 * from an EIR and the current project state.
 */

import type { Element } from "../types/elements";
import type {
  EIRTemplate,
  BEPTemplate,
  DeliveryApproach,
  DataDropResponse,
} from "../types/eir";

/**
 * Generate a BEP template that responds to the given EIR,
 * pre-populated from the current model state.
 */
export function generateBEP(
  eir: EIRTemplate,
  elements: Element[],
  organisationName = "Pensaer Design Ltd"
): BEPTemplate {
  // Collect unique element types present in the model
  const presentTypes = new Set(elements.map((e) => e.type));

  // Build data drop responses
  const dataDropResponses: DataDropResponse[] = eir.dataDrops.map((drop) => {
    const approaches: DeliveryApproach[] = drop.requirements.map((req) => ({
      elementType: req.elementType,
      responsibleParty: organisationName,
      authoringTool: "Pensaer BIM Platform",
      plannedLOIN: { ...req.levelOfInformationNeed },
      notes: presentTypes.has(req.elementType)
        ? `${elements.filter((e) => e.type === req.elementType).length} element(s) already in model`
        : "To be created",
    }));

    return {
      dataDropId: drop.id,
      deliveryApproaches: approaches,
      plannedDeliveryDate: drop.deadline,
      notes: `Response to data drop: ${drop.name}`,
    };
  });

  // Global requirement approaches
  const globalApproaches: DeliveryApproach[] = eir.globalRequirements.map((req) => ({
    elementType: req.elementType,
    responsibleParty: organisationName,
    authoringTool: "Pensaer BIM Platform",
    plannedLOIN: { ...req.levelOfInformationNeed },
  }));

  // If there are global requirements, add a "global" drop response
  if (globalApproaches.length > 0) {
    dataDropResponses.unshift({
      dataDropId: "global",
      deliveryApproaches: globalApproaches,
      plannedDeliveryDate: eir.dataDrops[0]?.deadline ?? new Date().toISOString(),
    });
  }

  return {
    version: "1.0.0",
    id: `bep-${eir.id}-${Date.now()}`,
    eirId: eir.id,
    projectName: eir.projectName,
    leadAppointedParty: organisationName,
    createdDate: new Date().toISOString(),
    projectTeam: [
      {
        role: "BIM Lead",
        organisation: organisationName,
      },
      {
        role: "Design Lead",
        organisation: organisationName,
      },
      {
        role: "Information Manager",
        organisation: organisationName,
      },
    ],
    dataDropResponses,
    informationDeliveryStrategy:
      "Information will be delivered via Pensaer BIM Platform " +
      "with IFC 4.3 export for interoperability. " +
      "Models will be validated against EIR requirements before each data drop.",
    federationStrategy:
      "Single federated model managed in Pensaer BIM Platform. " +
      "Discipline models will be coordinated through spatial coordination tools.",
    clashDetectionApproach:
      "Automated clash detection via Pensaer kernel with tolerance thresholds " +
      "defined per element type pair.",
    softwarePlatforms: [
      "Pensaer BIM Platform v0.1.0",
      "IFC 4.3 for exchange",
    ],
  };
}

/**
 * Format BEP as a readable summary string.
 */
export function formatBEPSummary(bep: BEPTemplate): string {
  const lines: string[] = [];
  lines.push(`╔══════════════════════════════════════════════════╗`);
  lines.push(`║          BIM EXECUTION PLAN                     ║`);
  lines.push(`╠══════════════════════════════════════════════════╣`);
  lines.push(`║ Project: ${bep.projectName.substring(0, 40).padEnd(40)}║`);
  lines.push(`║ EIR Ref: ${bep.eirId.substring(0, 40).padEnd(40)}║`);
  lines.push(`║ Lead:    ${bep.leadAppointedParty.substring(0, 40).padEnd(40)}║`);
  lines.push(`╠══════════════════════════════════════════════════╣`);
  lines.push(`║ Project Team:                                    ║`);
  for (const member of bep.projectTeam) {
    lines.push(`║  • ${member.role}: ${member.organisation}`.padEnd(51) + `║`);
  }
  lines.push(`╠══════════════════════════════════════════════════╣`);
  lines.push(`║ Data Drop Responses: ${bep.dataDropResponses.length}`.padEnd(51) + `║`);
  for (const resp of bep.dataDropResponses) {
    lines.push(`║  📦 ${resp.dataDropId} — ${resp.deliveryApproaches.length} deliverables`.padEnd(51) + `║`);
  }
  lines.push(`╠══════════════════════════════════════════════════╣`);
  lines.push(`║ Software: ${bep.softwarePlatforms.join(", ").substring(0, 39).padEnd(39)}║`);
  lines.push(`╚══════════════════════════════════════════════════╝`);
  return lines.join("\n");
}
