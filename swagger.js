const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sistema de Monitoramento Ambiental API',
      version: '1.0.0',
      description: 'API para monitoramento de ambiente, controle de iluminação e gestão de energia',
      contact: {
        name: 'Suporte Técnico',
        email: 'suporte@exemplo.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:4000/help',
        description: 'Servidor de Desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Usuario: {
          type: 'object',
          properties: {
            Nome: { type: 'string' },
            Ocupacao: { type: 'string' },
            Email: { type: 'string' },
            Status: { type: 'string' }
          }
        },
        AuthUser: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' }
          }
        },
        LoginCredentials: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' }
          }
        },
        MedicaoSensor: {
          type: 'object',
          required: ['dados'],
          properties: {
            dados: { type: 'number' },
            data: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    tags: [
      { name: 'Autenticação', description: 'Endpoints de autenticação' },
      { name: 'Usuários', description: 'Gestão de usuários' },
      { name: 'Monitoramento', description: 'Endpoints de monitoramento ambiental' },
      { name: 'Sensores', description: 'Gestão de sensores' },
      { name: 'Relatórios', description: 'Endpoints de relatórios e dados agregados' }
    ]
  },
  apis: ['./server.js'], // Caminho para os arquivos com as rotas
};

// Definições das rotas
const paths = {
  '/api/auth/register': {
    post: {
      tags: ['Autenticação'],
      summary: 'Registra um novo usuário',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/AuthUser'
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Usuário criado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  token: { type: 'string' },
                  user: { $ref: '#/components/schemas/AuthUser' }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/auth/login': {
    post: {
      tags: ['Autenticação'],
      summary: 'Realiza login do usuário',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/LoginCredentials'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Login realizado com sucesso'
        }
      }
    }
  },
  '/api/general/latest-data': {
    get: {
      tags: ['Monitoramento'],
      summary: 'Obtém os dados mais recentes de todas as medições',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Dados mais recentes recuperados com sucesso'
        }
      }
    }
  },
  '/api/consumo': {
    get: {
      tags: ['Relatórios'],
      summary: 'Obtém histórico de consumo',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Dados de consumo recuperados com sucesso'
        }
      }
    }
  },
  '/api/custos': {
    get: {
      tags: ['Relatórios'],
      summary: 'Obtém histórico de custos',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Dados de custos recuperados com sucesso'
        }
      }
    }
  },
  '/api/temperatura': {
    post: {
      tags: ['Sensores'],
      summary: 'Registra nova medição de temperatura',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                valor: { type: 'number' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Temperatura registrada com sucesso'
        }
      }
    }
  },
  '/api/iluminacao': {
    get: {
      tags: ['Sensores'],
      summary: 'Obtém dados de iluminação',
      responses: {
        200: {
          description: 'Dados de iluminação recuperados com sucesso'
        }
      }
    },
    post: {
      tags: ['Sensores'],
      summary: 'Registra nova medição de iluminação',
      responses: {
        200: {
          description: 'Iluminação registrada com sucesso'
        }
      }
    }
  },
  '/api/lampadas-ligadas': {
    post: {
      tags: ['Sensores'],
      summary: 'Registra quantidade de lâmpadas ligadas',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                valor: { 
                  type: 'integer',
                  minimum: 0,
                  maximum: 10
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Quantidade de lâmpadas registrada com sucesso'
        }
      }
    }
  },
  '/api/lampadas-ligadas/ultimo': {
    get: {
      tags: ['Sensores'],
      summary: 'Obtém última medição de lâmpadas ligadas',
      responses: {
        200: {
          description: 'Última medição recuperada com sucesso'
        }
      }
    }
  },
  '/api/ocupacao': {
    post: {
      tags: ['Sensores'],
      summary: 'Registra taxa de ocupação',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                valor: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 10
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Taxa de ocupação registrada com sucesso'
        }
      }
    }
  },
  '/api/ocupacao/ultimo': {
    get: {
      tags: ['Sensores'],
      summary: 'Obtém última medição de ocupação',
      responses: {
        200: {
          description: 'Última medição recuperada com sucesso'
        }
      }
    }
  },
  '/api/users': {
    get: {
      tags: ['Usuários'],
      summary: 'Lista todos os usuários técnicos',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Lista de usuários recuperada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Usuario'
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/rooms/get-rooms': {
    get: {
      tags: ['Monitoramento'],
      summary: 'Lista todos os cômodos cadastrados',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Lista de cômodos recuperada com sucesso'
        }
      }
    }
  }
};

// Adiciona as definições de paths ao objeto options
options.definition.paths = paths;

const specs = swaggerJsdoc(options);

module.exports = specs; 