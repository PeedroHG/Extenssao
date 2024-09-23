import * as vscode from 'vscode';

function isSQLFormatted(sql: string): boolean {
    // Quebra o SQL em linhas pedroca
    const lines = sql.trim().split('\n');
    
    // Define os padrões esperados para cada linha
    const expectedPatterns = [
        /^Select\s.*/i,        // Padrão para linha de SELECT
        /^From\s.*/i,          // Padrão para linha de FROM
        /^Join\s.*\sOn\s.*/i,  // Padrão para JOIN seguido de ON na mesma linha
        /^Where\s.*/i,         // Padrão para linha de WHERE
        /^And\s.*/i            // Padrão para linha de AND
    ];

    // Verifica se cada linha corresponde aos padrões esperados
    let patternIndex = 0;

    for (const line of lines) {
        if (patternIndex >= expectedPatterns.length) {
            break; // Todas as partes essenciais já foram verificadas
        }

        // Verifica se a linha atual corresponde ao padrão esperado
        if (expectedPatterns[patternIndex].test(line.trim())) {
            patternIndex++;
        }
    }

    // Retorna true se todas as linhas essenciais foram encontradas e estão formatadas corretamente
    return patternIndex === expectedPatterns.length;
}

function customSQLFormatter(sql: string, indentSize: number = 4): string {

    console.log("fora");

    if (isSQLFormatted(sql)) {
        console.log("dentro");
        return sql; // Retorna o SQL sem alterações se já estiver formatado
    }

    const keywords = ["SELECT", "FROM", "JOIN", "ON", "WHERE", "AND", "OR"];
    
    // Usar regex para dividir o SQL em tokens, incluindo palavras-chave, parênteses e vírgulas
    const tokens = sql.match(/\S+|,|\(|\)/g) || [];

    console.log(tokens);
    
    let formattedSQL = '';
    let currentLine = '';
    let insideSelect = false;
    let insideWhere = false;

    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        
        // Se o token é uma palavra-chave SQL
        if (keywords.includes(token.toUpperCase())) {
            if (token.toUpperCase() === "SELECT") {
                formattedSQL += 'Select ';
                insideSelect = true;
                insideWhere = false;
            } else if (token.toUpperCase() === "FROM") {
                formattedSQL += '\nFrom ';
                insideSelect = false;
            } else if (token.toUpperCase() === "JOIN") {
                formattedSQL += '\nJoin ';
                insideWhere = false;
            } else if (token.toUpperCase() === "ON") {
                formattedSQL += 'On ';
                insideWhere = false;
            } else if (token.toUpperCase() === "WHERE") {
                formattedSQL += '\nWhere ';
                insideWhere = true;
            } else if (token.toUpperCase() === "AND" || token.toUpperCase() === "OR") {
                formattedSQL += `\n${token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()} `;
                insideWhere = true;
            }
        } else if (token === ',') {
            // Para vírgulas entre colunas
            formattedSQL += ', ';
        } else if (token === '(') {
            // Para abrir parênteses
            formattedSQL += '(';
        } else if (token === ')') {
            // Para fechar parênteses
            formattedSQL += ') ';
        } else {
            // Processa tokens como colunas, tabelas e condições
            if (insideSelect) {
                // Capitaliza colunas e aliases no SELECT
                if (token.includes('.')) {
                    const [alias, column] = token.split('.');
                    token = `${alias.charAt(0).toUpperCase() + alias.slice(1).toLowerCase()}.${column.charAt(0).toUpperCase() + column.slice(1).toLowerCase()}`;
                } else {
                    token = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
                    console.log(token);
                }
                formattedSQL += token + ' ';
            } else if (insideWhere) {
                // No WHERE, trata as condições com parênteses
                if (i > 0 && tokens[i - 1] === '(') {
                    formattedSQL += ' ' + token;
                } else {
                    formattedSQL += token + ' ';
                }
            } else {
                // Para tabelas e outras partes do SQL
                if (token.includes('.')) {
                    const [alias, table] = token.split('.');
                    token = `${alias.charAt(0).toUpperCase() + alias.slice(1).toLowerCase()}.${table.charAt(0).toUpperCase() + table.slice(1).toLowerCase()}`;
                } else {
                    token = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
                }
                formattedSQL += token + ' ';
            }
        }
    }

    // Adiciona a última linha se não for uma linha em branco
    if (formattedSQL.endsWith(' ')) {
        formattedSQL = formattedSQL.trim();
    }

    return formattedSQL.trim();
}

// Função de ativação da extensão
export function activate(context: vscode.ExtensionContext) {
    console.log('Sua extensão SQL Formatter foi ativada!');

    // Registra o comando de formatação
    let disposable = vscode.commands.registerCommand('sqlFormatter.formatSQL', () => {
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            const document = editor.document;
            const selection = editor.selection;

            // Obtém o texto selecionado ou o texto completo do arquivo
            const text = selection.isEmpty ? document.getText() : document.getText(selection);

            // Chama a função de formatação personalizada
            const formattedSQL = customSQLFormatter(text);

            // Substitui o texto pelo SQL formatado
            editor.edit(editBuilder => {
                if (selection.isEmpty) {
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(document.getText().length)
                    );
                    editBuilder.replace(fullRange, formattedSQL);
                } else {
                    editBuilder.replace(selection, formattedSQL);
                }
            });
        }
    });

    // Adiciona o comando às subscrições da extensão
    context.subscriptions.push(disposable);
}

// Função de desativação (não faz nada aqui, mas é necessário)
export function deactivate() {}
