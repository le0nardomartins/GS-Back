const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');

const app = express();

app.use(express.json());

// Configurações do CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));

// Caminho para o banco de dados local
const localDBPath = path.join(__dirname, 'localDatabase.db');

// Verificar e criar o banco de dados se não existir
if (!fs.existsSync(localDBPath)) {
    console.log('Banco de dados não encontrado. Criando um novo...');
    fs.writeFileSync(localDBPath, '');
}

const localDb = new sqlite3.Database(localDBPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao localDatabase:', err.message);
    } else {
        console.log('Conexão ao localDatabase bem-sucedida.');
    }
});

// Função para criar tabelas se não existirem
const createTables = () => {
    const tableDefinitions = [
        `CREATE TABLE IF NOT EXISTS usuarios (
            Nome TEXT,
            Ocupacao TEXT,
            Email TEXT,
            Status TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS comodos (
            comodos TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS iluminacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dados REAL,
            data TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS ocupacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dados REAL,
            data TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS temperatura (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dados REAL,
            data TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS umidade (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dados REAL,
            data TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS luzesLigadas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dados INTEGER,
            data TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS consumo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dados REAL,
            data TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS custo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dados REAL,
            data TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS auth_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
    ];

    tableDefinitions.forEach((definition) => {
        localDb.run(definition, (err) => {
            if (err) {
                console.error('Erro ao criar tabela:', err.message);
            } else {
                console.log('Tabela criada ou já existe.');
            }
        });
    });
};


const calcularCustoEConsumo = () => {
    // Busca o último número de lâmpadas ligadas
    const queryLampadas = "SELECT dados FROM luzesLigadas ORDER BY data DESC LIMIT 1";

    localDb.get(queryLampadas, [], (err, row) => {
        if (err) {
            console.error("Erro ao buscar lâmpadas ligadas:", err.message);
            return;
        }

        const lampadasLigadas = row ? row.dados : 0;
        let custoPorMinuto = 0;

        // Calcula o custo inicial
        for (let i = 0; i < lampadasLigadas; i++) {
            if (i !== 1) {
                custoPorMinuto += 2; // Soma 2 para cada lâmpada diferente de 1
            }
        }

        // Multiplica o custo por 0.6 por minuto
        const multiplicadorTempo = 0.6;
        const custoAdicional = custoPorMinuto * multiplicadorTempo;

        // Valor total do custo
        const custoTotal = lampadasLigadas + custoAdicional;

        console.log(`Lampadas ligadas: ${lampadasLigadas}`);
        console.log(`Custo inicial: ${custoPorMinuto}`);
        console.log(`Custo adicional: ${custoAdicional}`);
        console.log(`Custo total: ${custoTotal}`);

        // Insere o custo total na tabela custo
        const queryCusto = "INSERT INTO custo (dados, data) VALUES (?, ?)";
        localDb.run(queryCusto, [custoTotal, new Date().toISOString()], (err) => {
            if (err) {
                console.error("Erro ao salvar custo:", err.message);
            } else {
                console.log("Custo salvo com sucesso.");
            }
        });

        // Insere o valor por lâmpada na tabela consumo
        const consumoPorLampada = lampadasLigadas; // Consumo é igual ao número de lâmpadas
        const queryConsumo = "INSERT INTO consumo (dados, data) VALUES (?, ?)";
        localDb.run(queryConsumo, [consumoPorLampada, new Date().toISOString()], (err) => {
            if (err) {
                console.error("Erro ao salvar consumo:", err.message);
            } else {
                console.log("Consumo salvo com sucesso.");
            }
        });
    });
};

// Configura a execução da função a cada minuto
setInterval(calcularCustoEConsumo, 60000);


// Criar tabelas no banco de dados
createTables();


app.get('/api/general/latest-data', async (req, res) => {
    try {
        console.log('Recebida solicitação GET em /api/general/latest-data');

        // Função para buscar o dado mais recente de uma tabela
        const getLatestData = (table) => {
            return new Promise((resolve, reject) => {
                const query = `SELECT dados FROM ${table} ORDER BY data DESC LIMIT 1`;
                localDb.get(query, [], (err, row) => {
                    if (err) {
                        return reject(`Erro ao buscar dados da tabela ${table}: ${err.message}`);
                    }
                    resolve({ table, data: row ? row.dados : null });
                });
            });
        };

        // Função para somar os valores da coluna dados em uma tabela
        const getSumOfData = (table) => {
            return new Promise((resolve, reject) => {
                const query = `SELECT SUM(dados) as total FROM ${table}`;
                localDb.get(query, [], (err, row) => {
                    if (err) {
                        return reject(`Erro ao somar dados da tabela ${table}: ${err.message}`);
                    }
                    resolve({ table, data: row ? row.total : 0 });
                });
            });
        };

        // Buscar os dados para cada tabela
        const luzesLigadasPromise = getLatestData('luzesLigadas'); // Apenas o último valor
        const consumoPromise = getSumOfData('consumo');            // Soma dos valores
        const custoPromise = getSumOfData('custo');                // Soma dos valores

        // Resolver todas as promessas
        const results = await Promise.all([luzesLigadasPromise, consumoPromise, custoPromise]);

        // Criar a resposta no formato { tabela: dado }
        const response = results.reduce((acc, { table, data }) => {
            acc[table] = data !== null ? data : 'Sem dados'; // Adiciona 'Sem dados' se não houver valor
            return acc;
        }, {});

        // Exibe a resposta no console
        console.log('Enviando resposta ao frontend:', JSON.stringify(response, null, 2));

        res.status(200).json(response);
    } catch (error) {
        console.error('Erro ao buscar dados mais recentes:', error.message);
        res.status(500).send('Erro ao buscar dados mais recentes');
    }
});


// Rota para obter os dados do gráfico
app.get('/api/dashboard/general-chart', async (req, res) => {
    try {
        const { filter } = req.query;
        let querySpec;

        // Definindo a query com base no filtro
        const currentDate = new Date();

        switch (filter) {
            case 'day':
                const oneDayAgo = new Date(currentDate);
                oneDayAgo.setDate(currentDate.getDate() - 1);
                querySpec = {
                    query: 'SELECT * FROM c WHERE c.data >= @startDate ORDER BY c.data DESC',
                    parameters: [{ name: '@startDate', value: oneDayAgo.toISOString() }]
                };
                break;
            case 'week':
                const oneWeekAgo = new Date(currentDate);
                oneWeekAgo.setDate(currentDate.getDate() - 7);
                querySpec = {
                    query: 'SELECT * FROM c WHERE c.data >= @startDate ORDER BY c.data DESC',
                    parameters: [{ name: '@startDate', value: oneWeekAgo.toISOString() }]
                };
                break;
            case 'month':
                const oneMonthAgo = new Date(currentDate);
                oneMonthAgo.setMonth(currentDate.getMonth() - 1);
                querySpec = {
                    query: 'SELECT * FROM c WHERE c.data >= @startDate ORDER BY c.data DESC',
                    parameters: [{ name: '@startDate', value: oneMonthAgo.toISOString() }]
                };
                break;
            case 'all':
            default:
                querySpec = {
                    query: 'SELECT * FROM c ORDER BY c.data DESC'
                };
                break;
        }

        const { resources: items } = await container.items.query(querySpec).fetchAll();

        const response = items.map(item => ({
            data: item.data, // Ex: '2024-10-14 03:37:58'
            temperatura: item.temperatura.toFixed(2),
            umidade: item.umidade.toFixed(2),
            corrente: item.corrente.toFixed(2),
            fluxo: item.fluxo.toFixed(2)
        }));

        res.status(200).send(response);
    } catch (error) {
        console.error('Erro ao buscar dados para o gráfico do Cosmos DB:', error.message);
        res.status(500).send('Erro ao buscar dados');
    }
});


// == CONSUMO ==
// Rota para buscar os dados de consumo
app.get('/api/consumo', (req, res) => {
    const query = 'SELECT dados, data FROM consumo ORDER BY data DESC';

    localDb.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar dados da tabela consumo:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar dados da tabela consumo',
                error: err.message
            });
        }

        // Verifica se encontrou dados
        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum dado encontrado na tabela consumo'
            });
        }

        // Retorna os dados formatados para uso no front-end
        const formattedData = rows.map(row => ({
            name: new Date(row.data).toLocaleDateString('pt-BR'), // Formata a data para o padrão brasileiro
            consumo: parseFloat(row.dados) // Converte os dados de consumo para número
        }));

        res.status(200).json({
            success: true,
            data: formattedData
        });
    });
});


// == CUSTOS ==
// Rota para buscar os dados
app.get('/api/custos', (req, res) => {
    const query = 'SELECT dados, data FROM custo ORDER BY data DESC';

    localDb.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar dados da tabela custo:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar dados da tabela custo',
                error: err.message
            });
        }

        // Verifica se encontrou dados
        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum dado encontrado na tabela custo'
            });
        }

        // Retorna os dados
        res.status(200).json({
            success: true,
            data: rows
        });
    });
});


// == TEMPERATURA ==
// Rota para salvar a temperatura no banco de dados
app.post("/api/temperatura", (req, res) => {
    const { valor } = req.body;

    const query = "INSERT INTO temperatura (dados, data) VALUES (?, ?)";
    localDb.run(query, [valor, new Date().toISOString()], function (err) {
        if (err) {
            console.error("Erro ao salvar temperatura:", err.message);
            return res.status(500).json({ error: "Erro ao salvar temperatura no banco de dados." });
        }

        res.status(200).json({ sucesso: true, id: this.lastID });
    });
});


// == ILUMINAÇÃO ==
// Rota para buscar dados de iluminação
app.get("/api/iluminacao", (req, res) => {
    const query = "SELECT dados, data FROM iluminacao ORDER BY data ASC";

    localDb.all(query, [], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar dados de iluminação:", err.message);
            return res.status(500).json({ error: "Erro ao buscar dados de iluminação." });
        }

        const formattedData = rows.map((row, index) => ({
            name: `Leitura ${index + 1}`,
            valor: row.dados,
        }));

        res.status(200).json(formattedData);
    });
});

// Rota para calcular e salvar o valor de iluminação
app.post("/api/iluminacao", (req, res) => {
    const queryLampadas = "SELECT dados FROM luzesLigadas ORDER BY data DESC LIMIT 1";

    // Buscar o último valor de lâmpadas ligadas
    localDb.get(queryLampadas, [], (err, row) => {
        if (err) {
            console.error("Erro ao buscar lâmpadas ligadas:", err.message);
            return res.status(500).json({ error: "Erro ao buscar lâmpadas ligadas." });
        }

        const lampadasLigadas = row ? row.dados : 0;
        const fator = Math.random() > 0.5 ? 10 : 8; // Multiplica por 10 ou 8
        const valorIluminacao = lampadasLigadas * fator;

        // Inserir o valor de iluminação na tabela
        const queryIluminacao = "INSERT INTO iluminacao (dados, data) VALUES (?, ?)";
        localDb.run(queryIluminacao, [valorIluminacao, new Date().toISOString()], (err) => {
            if (err) {
                console.error("Erro ao salvar iluminação:", err.message);
                return res.status(500).json({ error: "Erro ao salvar iluminação." });
            }

            res.status(200).json({
                sucesso: true,
                iluminacao: valorIluminacao,
            });
        });
    });
});


// == Lâmpadas ==
// Rota para registrar o valor de lâmpadas ligadas
app.post("/api/lampadas-ligadas", (req, res) => {
    const { valor } = req.body;

    if (valor < 0 || valor > 10) {
        return res.status(400).json({ error: "O valor deve estar entre 0 e 10." });
    }

    const query = "INSERT INTO luzesLigadas (dados, data) VALUES (?, ?)";
    localDb.run(query, [valor, new Date().toISOString()], function (err) {
        if (err) {
            console.error("Erro ao inserir valor de lâmpadas ligadas:", err.message);
            return res.status(500).json({ error: "Erro ao salvar o valor no banco de dados." });
        }

        res.status(200).json({ success: true, id: this.lastID });
    });
});

// Rota para buscar o último dado de lâmpadas ligadas
app.get("/api/lampadas-ligadas/ultimo", (req, res) => {
    const query = "SELECT dados, data FROM luzesLigadas ORDER BY data DESC LIMIT 1";
    localDb.get(query, [], (err, row) => {
        if (err) {
            console.error("Erro ao buscar o último dado de lâmpadas ligadas:", err.message);
            return res.status(500).json({ error: "Erro ao buscar o dado no banco de dados." });
        }

        if (!row) {
            return res.status(404).json({ error: "Nenhum dado de lâmpadas ligadas encontrado." });
        }

        res.status(200).json({
            sucesso: true,
            dados: row.dados,
            data: row.data,
        });
    });
});


// == OCUPACAO == 
// Rota para registrar o valor de ocupação
app.post("/api/ocupacao", (req, res) => {
    const { valor } = req.body;

    if (valor < 1 || valor > 10) {
        return res.status(400).json({ error: "O valor de ocupação deve estar entre 1 e 10." });
    }

    const query = "INSERT INTO ocupacao (dados, data) VALUES (?, ?)";
    localDb.run(query, [valor, new Date().toISOString()], function (err) {
        if (err) {
            console.error("Erro ao inserir valor de ocupação:", err.message);
            return res.status(500).json({ error: "Erro ao salvar o valor no banco de dados." });
        }

        res.status(200).json({ success: true, id: this.lastID });
    });
});

// Rota para buscar o último dado de ocupação
app.get("/api/ocupacao/ultimo", (req, res) => {
    const query = "SELECT dados, data FROM ocupacao ORDER BY data DESC LIMIT 1";
    localDb.get(query, [], (err, row) => {
        if (err) {
            console.error("Erro ao buscar o último dado de ocupação:", err.message);
            return res.status(500).json({ error: "Erro ao buscar o dado no banco de dados." });
        }

        if (!row) {
            return res.status(404).json({ error: "Nenhum dado de ocupação encontrado." });
        }

        res.status(200).json({
            sucesso: true,
            dados: row.dados,
            data: row.data,
        });
    });
});


// == ALERTAS ==
// Rota para obter os últimos 3 conjuntos de dados de cada medição
app.get('/api/alert/Alert-data', async (req, res) => {
    try {
        console.log('Recebida solicitação GET em /api/alert/Alert-data');

        // Definindo a query para buscar os últimos 3 registros ordenados por data
        const querySpec = {
            query: `
                SELECT * FROM c 
                ORDER BY c.data DESC
            `
        };

        // Buscando os dados no Cosmos DB
        const { resources: alertData } = await container.items.query(querySpec).fetchAll();

        // Formatando os dados e pegando apenas os últimos 3 de cada medição
        const formattedData = {
            temperatura: [],
            umidade: [],
            corrente: [],
            fluxo: []
        };

        alertData.forEach(item => {
            const { temperatura, umidade, corrente, fluxo } = item;

            // Verificar se já existem 3 itens no grupo para cada medição
            if (formattedData.temperatura.length < 3 && temperatura) {
                formattedData.temperatura.push({
                    id: item.id,
                    temperatura: parseFloat(temperatura).toFixed(2),
                    data: item.data,
                });
            }

            if (formattedData.umidade.length < 3 && umidade) {
                formattedData.umidade.push({
                    id: item.id,
                    umidade: parseFloat(umidade).toFixed(2),
                    data: item.data,
                });
            }

            if (formattedData.corrente.length < 3 && corrente) {
                formattedData.corrente.push({
                    id: item.id,
                    corrente: parseFloat(corrente).toFixed(2),
                    data: item.data,
                });
            }

            if (formattedData.fluxo.length < 3 && fluxo) {
                formattedData.fluxo.push({
                    id: item.id,
                    fluxo: parseFloat(fluxo).toFixed(2),
                    data: item.data,
                });
            }
        });

        // Verificando se houve dados formatados
        if (
            formattedData.temperatura.length > 0 ||
            formattedData.umidade.length > 0 ||
            formattedData.corrente.length > 0 ||
            formattedData.fluxo.length > 0
        ) {
            res.status(200).json(formattedData);
        } else {
            res.status(404).send('Nenhum dado encontrado');
        }
    } catch (error) {
        console.error('Erro ao buscar dados do Cosmos DB:', error.message);
        res.status(500).send('Erro ao buscar dados');
    }
});


// == TÉCNICOS == 
// Rota para obter todos os usuários do banco de dados (local)
app.get('/api/users', (req, res) => {
    const query = 'SELECT * FROM usuarios'; // Substitua "usuarios" pelo nome da sua tabela

    localDb.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar usuários do localDatabase:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar usuários do localDatabase',
                error: err.message
            });
        }

        // Verifica se encontrou usuários
        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum usuário encontrado'
            });
        }

        // Retorna a lista de usuários
        res.status(200).json({
            success: true,
            data: rows
        });
    });
});


// == CÔMODOS == 
// Endpoint para buscar Cômodos
app.get("/api/rooms/get-rooms", (req, res) => {
    const query = `
        SELECT comodos AS nome
        FROM comodos
    `;

    localDb.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar cômodos do localDatabase:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar cômodos do localDatabase',
                error: err.message
            });
        }

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Nenhum cômodo encontrado'
            });
        }

        res.status(200).json({
            success: true,
            data: rows
        });
    });
});


// Adicione a chave secreta para o JWT
const JWT_SECRET = 'sua_chave_secreta_aqui';

// Rota de registro
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Verificar se usuário já existe
        const checkUser = 'SELECT * FROM auth_users WHERE username = ? OR email = ?';
        localDb.get(checkUser, [username, email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao verificar usuário' });
            }
            if (user) {
                return res.status(400).json({ error: 'Usuário ou email já existe' });
            }

            // Criptografar senha
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Inserir novo usuário
            const insertUser = 'INSERT INTO auth_users (username, email, password) VALUES (?, ?, ?)';
            localDb.run(insertUser, [username, email, hashedPassword], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao criar usuário' });
                }

                // Gerar token JWT
                const token = jwt.sign({ id: this.lastID }, JWT_SECRET, { expiresIn: '24h' });

                res.status(201).json({
                    message: 'Usuário criado com sucesso',
                    token,
                    user: { id: this.lastID, username, email }
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Rota de login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Buscar usuário
        const query = 'SELECT * FROM auth_users WHERE email = ?';
        localDb.get(query, [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao buscar usuário' });
            }
            if (!user) {
                return res.status(400).json({ error: 'Usuário não encontrado' });
            }

            // Verificar senha
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'Senha inválida' });
            }

            // Gerar token JWT
            const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });

            res.json({
                message: 'Login realizado com sucesso',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});


// Adicione estas linhas após as configurações do CORS e antes das rotas
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Para redirecionar /help para a documentação do Swagger
app.get('/help', (req, res) => {
    res.redirect('/api-docs');
});


// Iniciar o servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Documentação Swagger disponível em http://localhost:${PORT}/api-docs`);
    console.log(`Acesse http://localhost:${PORT}/help para ajuda`);
});
