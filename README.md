This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Desarrollo local

```bash
cp .env.example .env     # y rellena los valores
npm ci
npm run dev
```

### Datos de prueba

`npm run seed` llena la base con 3 usuarios, 2 vendedores (uno aprobado y uno
pendiente), 6 productos repartidos entre `antojos` y `marketplace`, y horarios
para ambos vendedores. Es idempotente: borra las colecciones que siembra antes
de insertar, así que correrlo dos veces no duplica nada.

```bash
npm run seed
```

Por eso mismo **nunca lo apuntes a producción**. El script se niega a correr si
`NODE_ENV=production`, y si `MONGO_URI` no apunta a localhost exige un `--yes`
explícito:

```bash
npm run seed -- --yes      # solo contra un cluster de desarrollo
```

### Verificación

```bash
npm run verify   # lint + test + build, la misma puerta que corre el CI
npm run test     # solo los tests unitarios y de integración
```

Los tests de integración levantan un MongoDB en memoria
(`mongodb-memory-server`), así que no necesitan base de datos ni conexión de
red. La primera ejecución descarga el binario de mongod y tarda más.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
## Yes
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
