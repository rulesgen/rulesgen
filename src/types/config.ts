export interface RulesGenConfig {
  version?: string;
  tools?: string[];
  depth?: 'quick' | 'standard' | 'deep';
  focus?: string;
  ignore?: string[];
  output?: string;
  merge?: boolean;
  apiKey?: string;
  dashboard?: {
    token?: string;
    projectId?: string;
  };
  customSections?: {
    claude?: string[];
    cursor?: string[];
    copilot?: string[];
    windsurf?: string[];
  };
}
