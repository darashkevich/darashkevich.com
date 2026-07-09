import fs from 'node:fs';
import path from 'node:path';

export function inlineIm8Assets(html, css, challengeDir) {
  const fontsDir = path.join(challengeDir, 'fonts');
  let inlinedCss = css;

  for (const file of fs.readdirSync(fontsDir)) {
    if (!file.endsWith('.woff2')) continue;
    const b64 = fs.readFileSync(path.join(fontsDir, file)).toString('base64');
    inlinedCss = inlinedCss.replaceAll(
      `url("fonts/${file}")`,
      `url("data:font/woff2;base64,${b64}")`
    );
  }

  const logoSvg = fs.readFileSync(path.join(challengeDir, 'im8-logo.svg'), 'utf8');
  const logoUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

  return {
    html: html.replaceAll('__IM8_LOGO__', logoUri),
    css: inlinedCss,
  };
}
