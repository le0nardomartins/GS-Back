import sqlite3

# Caminho do banco de dados
DB_PATH = 'localDatabase.db'

# Conectando ao banco de dados
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    # Deletando os dados das tabelas iluminacao, temperatura, consumo e custo
    cursor.execute('''DELETE FROM temperatura''')
    cursor.execute('''DELETE FROM iluminacao''')
    cursor.execute('''DELETE FROM consumo''')
    cursor.execute('''DELETE FROM custo''')

    # Salvando as mudanças no banco de dados
    conn.commit()

    print("Dados das tabelas 'temperatura', 'iluminacao', 'consumo' e 'custo' apagados com sucesso.")

except sqlite3.Error as e:
    print(f"Erro ao tentar apagar os dados no banco de dados: {e}")
finally:
    # Fechando a conexão com o banco de dados
    conn.close()
