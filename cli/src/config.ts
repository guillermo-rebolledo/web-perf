import Conf from "conf";

interface CliConfig {
  baseUrl: string;
  apiKey: string;
  email: string;
}

export const conf = new Conf<CliConfig>({
  projectName: "side-cli",
  projectSuffix: "",
});

export function getConfig(): CliConfig | null {
  const baseUrl = conf.get("baseUrl");
  const apiKey = conf.get("apiKey");
  const email = conf.get("email");

  if (!baseUrl || !apiKey) return null;

  return { baseUrl, apiKey, email: email ?? "" };
}

export function saveConfig(config: CliConfig): void {
  conf.set("baseUrl", config.baseUrl);
  conf.set("apiKey", config.apiKey);
  conf.set("email", config.email);
}

export function clearConfig(): void {
  conf.clear();
}
