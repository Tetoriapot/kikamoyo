export function optimizeSvgText(source: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(source, 'image/svg+xml');
  const svg = document.documentElement;
  if (svg.nodeName.toLowerCase() === 'parsererror') return source;
  svg
    .querySelectorAll('[data-export-ignore="true"]')
    .forEach((node) => node.remove());
  svg.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (
        attribute.name === 'class' ||
        (attribute.name.startsWith('data-') &&
          attribute.name !== 'data-export-background')
      )
        node.removeAttribute(attribute.name);
    });
  });
  return new XMLSerializer()
    .serializeToString(svg)
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
