declare module 'slugify' {
  export default function slugify(value: string, options?: { lower?: boolean; strict?: boolean }): string;
}
