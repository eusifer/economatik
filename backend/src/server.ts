import express from 'express';
import cors from 'cors';
import { ApolloServer } from 'apollo-server-express';
import dotenv from 'dotenv';
import { connectMongoDB } from './config/db';
import { initializePostgreSQL } from './db/pgInit';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import restRoutes from './routes/restRoutes';
import { logger, getClientIp } from './utils/logger';
import { verifyToken } from './middleware/auth';

dotenv.config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  const app = express();

  // Configuración de Middlewares globales
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Registrar rutas REST
  app.use('/api', restRoutes);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime() });
  });

  // Configuración de Apollo Server para GraphQL
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const remoteIp = getClientIp(req);
      const authHeader = req.headers.authorization || '';
      let user = undefined;

      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          user = verifyToken(token);
        } catch (err: any) {
          logger.warn(`Petición GraphQL con token inválido: ${err.message}`, { remote_addr: remoteIp });
        }
      }

      return { user, remoteIp };
    },
    introspection: true,
  });

  await server.start();
  server.applyMiddleware({ app: app as any, path: '/graphql' });

  // Inicializar bases de datos y arrancar el servidor
  try {
    // 1. Conectar MongoDB Atlas / Local
    await connectMongoDB();

    // 2. Inicializar tablas PostgreSQL
    await initializePostgreSQL();

    // 3. Escuchar puerto
    app.listen(PORT, () => {
      logger.info(`Servidor ENOCOMATIK ejecutándose en el puerto ${PORT}`);
      logger.info(`GraphQL endpoint listo en http://localhost:${PORT}${server.graphqlPath}`);
    });
  } catch (error) {
    logger.error('Fallo crítico al inicializar los servicios del backend:', error);
    process.exit(1);
  }
}

startServer();
export {};
