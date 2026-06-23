export const REPO = process.env.GITHUB_REPO || '0xdisruptivo710/phytonatusv2';
export const BRANCH = process.env.GITHUB_BRANCH || 'main';

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`variável de ambiente ausente: ${name}`);
  return v;
}
