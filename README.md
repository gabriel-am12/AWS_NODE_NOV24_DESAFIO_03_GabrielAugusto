## 🚗 CompassCar API 3.0

API para o gerenciamento de pedidos, clientes e carros em um sistema de vendas de veículos. Ele utiliza Node.js com TypeScript, Prisma como ORM para o banco de dados MySQL, e validação de dados com o Joi.

## 💻 Como executar o projeto localmente ⬇️

### Pré-requisitos

- [Node.js](https://nodejs.org/) (v14 ou superior)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [MySQL](https://www.mysql.com/) (Caso não vá utilizar o Docker)
- [Postgresql](https://www.postgresql.org/)(Container para Postgre já está incluso no projeto)

1 - Clone o projeto

```bash
  git clone git@github.com:gabriel-am12/AWS_NODE_NOV24_DESAFIO_03_GabrielAugusto.git
```

2 - Vá até o diretório

```bash
  cd .\AWS_NODE_NOV24_DESAFIO_03_GabrielAugusto\
```

3 - Instale as dependências

```bash
  npm install
```

4 - (COM DOCKER) Configure seu banco de dados no arquivo .env, por exemplo:

```bash
  DATABASE_URL="postgresql://admin:root@localhost:5432/compasscar"
  JWT_SECRET="seu_token_secreto"
```

4.1 - Rode os comandos a seguir para construir e iniciar os contêineres:

```bash
  docker-compose build
  docker-compose up -d
```

4 - (SEM DOCKER) Configure seu banco de dados no arquivo .env, por exemplo:

```bash
  DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/DB_NAME"
  JWT_SECRET="seu_token_secreto"
```

5 - Execute as migrações e crie o cliente do Prisma

```bash
  npx prisma migrate dev
  npx prisma generate
```

6 - Execute as seeds para popular o B.D (opcional)

```bash
  npm run seed
```

7 - Inicie o servidor

```bash
  npm run dev
```

7.1 - Buildar a aplicação

```bash
  npm run build
```

7.2 - Iniciar a aplicação compilada

```bash
  npm start
```

8 - Executar testes

#### OBS.: Testes já estão definidos para --coverage, exibindo a cobertura de testes feitos no projeto

```bash
  npm run test
```

Executar Lint

```bash
  npm run lint
```

## 🔢 Documentação da API

#### OBS.: Testes que usem a rota da AWS em clientes como Postman ou Insomnia devem utilizar o seguinte prefixo nas rotas:

```bash
  http://ec2-18-227-24-212.us-east-2.compute.amazonaws.com:8080/restante padrão da rota
```

- A documentação da API está disponível através do Swagger UI. Quando estiver rodando o projeto, você pode acessá-la em [http://localhost:3000/api-docs](http://localhost:3000/api-docs).
- Ou também no endereço AWS [http://ec2-18-227-24-212.us-east-2.compute.amazonaws.com:8080/api-docs/](http://ec2-18-227-24-212.us-east-2.compute.amazonaws.com:8080/api-docs/)

![Swagger UI](assets/swagger_print.png)

## 🗃️ Tabelas do B.D

![compassCarV2DBDiagram](assets/compassCarV2DBDiagram.png)

## Desafios enfrentados durante o desenvolvimento

### 1. Criação de Testes

Compreender a lógica e a estrutura dos testes unitários foi desafiador. No entanto, com o tempo, a prática se tornou mais natural e trouxe um ganho significativo para a qualidade do código.

### 2. Exposição da API

Entender o processo de subir o projeto para a instância e expor a API para acesso externo. Esse desafio trouxe muitos aprendizados, desde a configuração do ambiente até a utilização de DNS público e gerenciamento de variáveis de ambiente.

### 3. Reflexão Geral

O desenvolvimento deste projeto apresentou desafios diversos que contribuíram para o aprendizado e evolução no uso de boas práticas em backend, integração de sistemas e desenvolvimento geral.
