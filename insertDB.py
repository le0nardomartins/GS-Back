import sqlite3

# Caminho do banco de dados
DB_PATH = 'localDatabase.db'

# Conectando ao banco de dados
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    # Lista de cômodos para inserção
    comodos_teste = [
        ("Sala de Estar",),
        ("Cozinha",),
        ("Quarto",),
        ("Banheiro",),
        ("Escritório",)
    ]

    # Inserindo dados de teste na tabela comodos
    cursor.executemany('''
        INSERT INTO comodos (comodos) VALUES (?)
    ''', comodos_teste)

    # Salvando as mudanças no banco de dados
    conn.commit()

    print("Cômodos inseridos com sucesso.")

except sqlite3.Error as e:
    print(f"Erro ao tentar inserir dados no banco de dados: {e}")
finally:
    # Fechando a conexão com o banco de dados
    conn.close()
