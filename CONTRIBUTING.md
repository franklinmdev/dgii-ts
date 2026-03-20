# Contribuir a dgii-ts / Contributing to dgii-ts

## Configuración del entorno / Environment setup

```bash
git clone https://github.com/franklinmdev/dgii-ts.git
cd dgii-ts
npm install
```

## Scripts disponibles / Available scripts

```bash
npm run build       # Compilar la librería / Build the library
npm test            # Ejecutar tests / Run tests
npm run test:watch  # Tests en modo watch / Watch mode
npm run typecheck   # Verificar tipos / Type check
npx vitest run --coverage  # Coverage report (mínimo 90%)
```

## Guía para pull requests / PR guidelines

- Usa [conventional commits](https://www.conventionalcommits.org/) para los
  mensajes de commit (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)
- Un feature o fix por PR — mantén los cambios enfocados
- Asegúrate de que todos los tests pasen antes de enviar tu PR
- Usa TypeScript estricto — nada de `any`
- Incluye tests para cualquier funcionalidad nueva
- Mantén la cobertura por encima de 90% (branches, functions, lines)

---

- Use [conventional commits](https://www.conventionalcommits.org/) for commit
  messages (`feat:`, `fix:`, `docs:`, `test:`, `chore:`)
- One feature or fix per PR — keep changes focused
- Make sure all tests pass before submitting your PR
- Use strict TypeScript — no `any`
- Include tests for any new functionality
- Keep coverage above 90% (branches, functions, lines)

## Reportar issues / Reporting issues

Usa las plantillas de issues en GitHub:

- [Reporte de bug / Bug report](https://github.com/franklinmdev/dgii-ts/issues/new?template=bug_report.md)
- [Solicitud de funcionalidad / Feature request](https://github.com/franklinmdev/dgii-ts/issues/new?template=feature_request.md)

## Estilo de código / Code style

- TypeScript estricto (`strict: true`, sin `any`)
- Indentación con 2 espacios
- Comillas simples
- Punto y coma al final de cada sentencia

---

- Strict TypeScript (`strict: true`, no `any`)
- 2-space indentation
- Single quotes
- Semicolons
