/**
 * Demo module — auto-play scripts for Pensaer BIM
 */

export {
  generateHighRiseCommands,
  HIGH_RISE_DEMO_COMMANDS,
  HIGH_RISE_METADATA,
} from "./highRiseDemo";

export {
  generateInvestorDemoCommands,
  INVESTOR_DEMO_COMMANDS,
  INVESTOR_DEMO_METADATA,
} from "./investorDemo";

export {
  useDemoRunner,
  DEMO_SCRIPTS,
  TIMING_PRESETS,
  type DemoRunnerCallbacks,
  type DemoRunnerState,
  type DemoScript,
  type DemoTimingConfig,
} from "./DemoRunner";
