# Como publicar e abrir o Pull Request

O repositório já vem com o commit pronto na branch `feat/pipeline-ci`.
São três comandos.

```bash
# 1. Entre na pasta extraída
cd atividades_cicd

# 2. Confirme que o remote aponta para o seu repositório
git remote -v
# Se estiver vazio ou errado:
# git remote add origin https://github.com/MatheusSales95/atividades_CiCd.git

# 3. Envie a branch
git push -u origin feat/pipeline-ci
```

Depois abra o Pull Request:

https://github.com/MatheusSales95/atividades_CiCd/compare/main...feat/pipeline-ci

Ao criar o PR, o workflow `CI` dispara sozinho e executa as 7 jobs.
Me avise quando o PR estiver aberto — eu acompanho a execução e capturo os prints.

## Observação sobre o CodeQL

O job de segurança usa CodeQL, que é gratuito em repositórios públicos.
Se o repositório estiver privado, o CodeQL falha por falta de licença —
nesse caso, torne-o público em *Settings → General → Danger Zone*,
ou remova os dois passos do CodeQL do arquivo `.github/workflows/ci.yml`
(as outras duas análises de segurança continuam funcionando).
