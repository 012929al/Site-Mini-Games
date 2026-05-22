// BANCO DE DADOS LOCAL E ESTADO DE SESSÃO
let usersDatabase = [];
let currentLoggedInUser = null;

const defaultProgress = {
    clicker: { level: 1, currentPoints: 0, requiredPoints: 50 },
    memory: { level: 1, recordStage: 1 },
    math: { level: 1, streak: 0 },
    reaction: { level: 1, bestTime: 9999 },
    stacker: { level: 1, topScore: 0 },
    tictactoe: { level: 0 } // <-- ADICIONE ESTA LINHA (Será a contagem de empates/vitórias contra a IA)
};

let playerProgress = {};

document.addEventListener("DOMContentLoaded", () => {
    loadAuthSystem();
    setupAuthEvents();
    setupGlobalClickClose();
});

/* ==========================================
   MECÂNICA E INTERAÇÕES DO MENU HAMBÚRGUER
   ========================================== */
function toggleUserMenu() {
    const drawer = document.getElementById("user-menu-drawer");
    drawer.classList.toggle("open");
}

// Fecha o menu automaticamente se o jogador clicar em qualquer outro lugar da tela
function setupGlobalClickClose() {
    document.addEventListener("click", (e) => {
        const drawer = document.getElementById("user-menu-drawer");
        const trigger = document.getElementById("hamburger-trigger");
        
        if (drawer && drawer.classList.contains("open")) {
            if (!drawer.contains(e.target) && !trigger.contains(e.target)) {
                drawer.classList.remove("open");
            }
        }
    });
}

/* ==========================================
   AUTENTICAÇÃO & COMPORTAMENTO DE CONTAS
   ========================================== */
function loadAuthSystem() {
    const savedUsers = localStorage.getItem("arcade_verse_users");
    usersDatabase = savedUsers ? JSON.parse(savedUsers) : [];

    const sessionToken = localStorage.getItem("arcade_verse_session");
    if (sessionToken) {
        const foundUser = usersDatabase.find(u => u.username === sessionToken);
        if (foundUser) {
            loginSuccess(foundUser);
            return;
        }
    }
    function loadAuthSystem() {
        const savedUsers = localStorage.getItem("arcade_verse_users");
        usersDatabase = savedUsers ? JSON.parse(savedUsers) : [];
    
        const sessionToken = localStorage.getItem("arcade_verse_session");
        if (sessionToken) {
            const foundUser = usersDatabase.find(u => u.username === sessionToken);
            if (foundUser) {
                loginSuccess(foundUser);
                startArcadeMusic(); // <-- ADICIONE ISSO AQUI
                return;
            }
        }
        showView("auth-view");
        document.getElementById("main-header").style.display = "none";
    }
    showView("auth-view");
    document.getElementById("main-header").style.display = "none";
}

function setupAuthEvents() {
    document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const userIn = document.getElementById("login-username").value.trim();
        const passIn = document.getElementById("login-password").value;

        const user = usersDatabase.find(u => u.username.toLowerCase() === userIn.toLowerCase());
        
        if (user && user.password === passIn) {
            loginSuccess(user);
        } else {
            alert("Usuário ou senha incorretos!");
        }
    });

    document.getElementById("register-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const userIn = document.getElementById("reg-username").value.trim();
        const passIn = document.getElementById("reg-password").value;

        if (userIn.length < 3 || passIn.length < 4) {
            alert("Username min: 3 letras. Senha min: 4 dígitos.");
            return;
        }

        const userExists = usersDatabase.some(u => u.username.toLowerCase() === userIn.toLowerCase());
        if (userExists) {
            alert("Nome de usuário indisponível!");
            return;
        }

        const newUser = {
            username: userIn,
            password: passIn,
            avatar: null, // Armazenará a string base64 compactada da foto
            progress: JSON.parse(JSON.stringify(defaultProgress))
        };

        usersDatabase.push(newUser);
        localStorage.setItem("arcade_verse_users", JSON.stringify(usersDatabase));
        
        alert("Conta registrada! Faça login para jogar.");
        toggleAuthMode("login");
    });
}

function loginSuccess(user) {
    currentLoggedInUser = user.username;
    playerProgress = user.progress;
    
    localStorage.setItem("arcade_verse_session", user.username);
    
    document.getElementById("main-header").style.display = "flex";
    
    showView("hub-view");
    updateHubUI();
    startArcadeMusic();
}

// BOTÃO: SAIR DA CONTA (Efeito de Desconexão Completa)
function logoutUser() {
    stopArcadeMusic();
    localStorage.removeItem("arcade_verse_session");
    currentLoggedInUser = null;
    playerProgress = {};
    
    document.getElementById("user-menu-drawer").classList.remove("open");
    document.getElementById("main-header").style.display = "none";
    
    document.getElementById("login-form").reset();
    document.getElementById("register-form").reset();
    
    showView("auth-view");
}

// BOTÃO: TROCAR DE CONTA (Fecha painéis e foca o formulário de login imediatamente)
function switchAccount() {
    document.getElementById("user-menu-drawer").classList.remove("open");
    logoutUser();
}

function toggleAuthMode(mode) {
    if (mode === 'register') {
        document.getElementById("login-box").style.display = "none";
        document.getElementById("register-box").style.display = "block";
    } else {
        document.getElementById("register-box").style.display = "none";
        document.getElementById("login-box").style.display = "block";
    }
}

function saveGameData() {
    if (!currentLoggedInUser) return;
    const userIndex = usersDatabase.findIndex(u => u.username === currentLoggedInUser);
    if (userIndex !== -1) {
        usersDatabase[userIndex].progress = playerProgress;
        localStorage.setItem("arcade_verse_users", JSON.stringify(usersDatabase));
    }
    updateHubUI();
}

/* ==========================================
   SISTEMA HUB & ENGINES DOS INTEGRANTES
   ========================================== */
function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
}

function launchGame(gameId) {
    showView("game-view");
    const stage = document.getElementById("game-stage");
    stage.innerHTML = ""; 

    switch(gameId) {
        case 'clicker': buildClickerGame(stage); break;
        case 'memory': buildMemoryGame(stage); break;
        case 'math': buildMathGame(stage); break;
        case 'reaction': buildReactionGame(stage); break;
        case 'stacker': buildStackerGame(stage); break;
        case 'tictactoe': buildTicTacToeGame(stage); break;
    }
}

function backToHub() {
    document.getElementById("game-stage").innerHTML = "";
    showView("hub-view");
    updateHubUI();
}

function updateHubUI() {
    if (!playerProgress.clicker) return;

    let totalLevels = playerProgress.clicker.level + 
                     playerProgress.memory.level + 
                     playerProgress.math.level + 
                     playerProgress.reaction.level + 
                     playerProgress.stacker.level;
                     
    let levelFinal = totalLevels - 4;

    // Atualiza dados de texto do Menu
    document.getElementById("drawer-username").innerText = currentLoggedInUser;
    document.getElementById("drawer-level").innerHTML = `<i class="fa-solid fa-crown"></i> Nível: ${levelFinal}`;

    // =========================================================================
    // BUSQUE POR ESTE TRECHO EXATO DENTRO DA FUNÇÃO updateHubUI() NO SCRIPT.JS
    // =========================================================================
    
    // LÓGICA DE RENDERIZAÇÃO DA FOTO DE PERFIL
    const currentUserData = usersDatabase.find(u => u.username === currentLoggedInUser);
    const imgElement = document.getElementById("profile-img");
    const iconElement = document.getElementById("profile-icon");
    
    if (currentUserData && currentUserData.avatar) {
        imgElement.src = currentUserData.avatar;
        imgElement.style.display = "block";   // Mostra a sua foto da galeria
        iconElement.style.display = "none";    // <-- CORRIGIDO AQUI! Desaparece com o astronauta padrão
    } else {
        imgElement.style.display = "none";    // Esconde a tag de imagem vazia
        iconElement.style.display = "block";   // Mantém o astronauta se não tiver foto
    }
    
    // Atualiza as barras de progresso do Hub dos Jogos
    document.getElementById("hub-clicker-lvl").innerText = playerProgress.clicker.level;
    let pct1 = (playerProgress.clicker.currentPoints / playerProgress.clicker.requiredPoints) * 100;
    document.getElementById("hub-clicker-bar").style.width = `${Math.min(pct1, 100)}%`;

    document.getElementById("hub-memory-lvl").innerText = playerProgress.memory.level;
    document.getElementById("hub-memory-bar").style.width = `${(playerProgress.memory.level / 10) * 100}%`;

    document.getElementById("hub-math-lvl").innerText = playerProgress.math.level;
    document.getElementById("hub-math-bar").style.width = `${(playerProgress.math.streak / 5) * 100}%`;

    document.getElementById("hub-reaction-lvl").innerText = playerProgress.reaction.level;
    document.getElementById("hub-reaction-bar").style.width = playerProgress.reaction.bestTime < 9999 ? '100%' : '0%';

    document.getElementById("hub-stacker-lvl").innerText = playerProgress.stacker.level;
    document.getElementById("hub-stacker-bar").style.width = `${(playerProgress.stacker.topScore / 12) * 100}%`;
    
    // Adicione isto junto com os outros atualizadores de progresso do Hub:
    document.getElementById("hub-tictactoe-lvl").innerText = playerProgress.tictactoe ? playerProgress.tictactoe.level : 0;
    document.getElementById("hub-tictactoe-bar").style.width = playerProgress.tictactoe ? `${Math.min(playerProgress.tictactoe.level * 10, 100)}%` : '0%';
}

// [JOGO 1] CLICKER ESTELAR
function buildClickerGame(stage) {
    document.getElementById("current-game-title").innerText = "Clicker Estelar";
    const render = () => {
        document.getElementById("game-current-stat").innerText = `Nível: ${playerProgress.clicker.level}`;
        stage.innerHTML = `
            <div class="score-display">Cristais: <strong>${playerProgress.clicker.currentPoints}</strong> / ${playerProgress.clicker.requiredPoints}</div>
            <button class="clicker-btn" id="action-clicker"><i class="fa-solid fa-gem"></i></button>
            <p style="margin-top:20px; color:var(--text-muted)">Minere energia clicando no cristal.</p>
        `;
        document.getElementById("action-clicker").addEventListener("click", () => {
            playClickSound();
            playerProgress.clicker.currentPoints += playerProgress.clicker.level * 2;
            if(playerProgress.clicker.currentPoints >= playerProgress.clicker.requiredPoints) {
                playerProgress.clicker.level += 1;
                playerProgress.clicker.currentPoints = 0;
                playerProgress.clicker.requiredPoints = Math.floor(playerProgress.clicker.requiredPoints * 1.6);
                alert("Base evoluída para o Nível " + playerProgress.clicker.level);
            }
            saveGameData();
            render();
        });
    };
    render();
}

// [JOGO 2] MEMÓRIA NEON
function buildMemoryGame(stage) {
    document.getElementById("current-game-title").innerText = "Memória Neon";
    let lvl = playerProgress.memory.level;
    document.getElementById("game-current-stat").innerText = `Fase: ${lvl}`;

    let icons = ["🚀", "🛸", "👾", "⭐", "🔮", "🪐", "💎", "⚡"];
    let pairsCount = lvl + 1 > 8 ? 8 : lvl + 1; 
    let selectedIcons = icons.slice(0, pairsCount);
    let deck = [...selectedIcons, ...selectedIcons].sort(() => Math.random() - 0.5);

    stage.innerHTML = `
        <div class="score-display">Encontre os pares neon correspondentes.</div>
        <div class="memory-grid" style="grid-template-columns: repeat(${pairsCount <= 4 ? pairsCount : 4}, 1fr)"></div>
    `;

    const grid = stage.querySelector(".memory-grid");
    let flippedCards = [];
    let matchedPairs = 0;

    deck.forEach((icon, index) => {
        const card = document.createElement("div");
        card.classList.add("memory-card");
        card.dataset.icon = icon;
        card.innerText = icon;
        grid.appendChild(card);

        card.addEventListener("click", () => {
            if (flippedCards.length < 2 && !card.classList.contains("flipped") && !card.classList.contains("matched")) {
                playClickSound();
                card.classList.add("flipped");
                flippedCards.push(card);

                if (flippedCards.length === 2) {
                    if (flippedCards[0].dataset.icon === flippedCards[1].dataset.icon) {
                        flippedCards.forEach(c => c.classList.add("matched"));
                        matchedPairs++;
                        flippedCards = [];
                        if (matchedPairs === pairsCount) {
                            playerProgress.memory.level += 1;
                            saveGameData();
                            stage.innerHTML += `<div class="success-banner">FASE COMPLETA! Carregando...</div>`;
                            setTimeout(() => buildMemoryGame(stage), 1200);
                        }
                    } else {
                        setTimeout(() => {
                            playGameOverSound();
                            flippedCards.forEach(c => c.classList.remove("flipped"));
                            flippedCards = [];
                        }, 700);
                    }
                }
            }
        });
    });
}

// [JOGO 3] MATEMÁTICA EXPRESS
function buildMathGame(stage) {
    document.getElementById("current-game-title").innerText = "Matemática Express";
    let currentLvl = playerProgress.math.level;
    document.getElementById("game-current-stat").innerText = `Nível: ${currentLvl}`;

    let maxNum = currentLvl * 10;
    let num1 = Math.floor(Math.random() * maxNum) + 1;
    let num2 = Math.floor(Math.random() * maxNum) + 1;
    let answer = num1 + num2;

    let options = [answer, answer + 3, answer - 2, answer + Math.floor(Math.random() * 5) + 1];
    options = [...new Set(options)].sort(() => Math.random() - 0.5); 

    stage.innerHTML = `
        <div class="math-box">
            <div class="score-display">Sequência de acertos: <strong>${playerProgress.math.streak}</strong>/5</div>
            <div class="equation">${num1} + ${num2}</div>
            <div class="math-options"></div>
        </div>
    `;

    const optContainer = stage.querySelector(".math-options");
    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.classList.add("btn-opt");
        btn.innerText = opt;
        optContainer.appendChild(btn);

        btn.addEventListener("click", () => {
            if(opt === answer) {
                playClickSound();
                playerProgress.math.streak += 1;
                if(playerProgress.math.streak >= 5) {
                    playerProgress.math.level += 1;
                    playerProgress.math.streak = 0;
                    alert("Avançou para o nível matemático " + playerProgress.math.level);
                }
            } else {
                playGameOverSound();
                playerProgress.math.streak = 0; 
                alert("Errado! Sequência resetada.");
            }
            saveGameData();
            buildMathGame(stage);
        });
    });
}

// [JOGO 4] REFLEXO NINJA
function buildReactionGame(stage) {
    document.getElementById("current-game-title").innerText = "Reflexo Ninja";
    let best = playerProgress.reaction.bestTime;
    document.getElementById("game-current-stat").innerText = `Ranking: Nív. ${playerProgress.reaction.level}`;

    stage.innerHTML = `
        <div class="score-display">Melhor tempo: ${best === 9999 ? '0ms' : best + 'ms'}</div>
        <div id="click-zone" class="reaction-zone zone-waiting">CLIQUE PARA COMEÇAR</div>
    `;

    const zone = document.getElementById("click-zone");
    let state = "idle"; 
    let timeoutId;
    let startTime;

    zone.addEventListener("click", () => {
        if (state === "idle") {
            playClickSound();
            zone.classList.replace("zone-waiting", "zone-result");
            zone.innerText = "AGUARDE O SINAL VERDE...";
            state = "waiting";

            timeoutId = setTimeout(() => {
                zone.classList.replace("zone-result", "zone-ready");
                zone.innerText = "CLIQUE AGORA!!!";
                state = "ready";
                startTime = window.performance.now();
            }, Math.random() * 2500 + 1200);

        } else if (state === "waiting") {
            playGameOverSound();
            clearTimeout(timeoutId);
            zone.classList.replace("zone-result", "zone-waiting");
            zone.innerText = "MUITO CEDO! Tente de novo.";
            state = "idle";

        } else if (state === "ready") {
            playClickSound();
            let reactionTime = Math.round(window.performance.now() - startTime);
            state = "idle";

            if(reactionTime < playerProgress.reaction.bestTime) {
                playerProgress.reaction.bestTime = reactionTime;
                playerProgress.reaction.level += 1;
                saveGameData();
            }
            zone.className = "reaction-zone zone-result";
            zone.innerHTML = `Tempo: <strong>${reactionTime}ms</strong><br><br>Clique para jogar de novo.`;
        }
    });
}

// [JOGO 5] EMPILHADOR MODERNO
function buildStackerGame(stage) {
    document.getElementById("current-game-title").innerText = "Empilhador Moderno";
    document.getElementById("game-current-stat").innerText = `Andar Max: ${playerProgress.stacker.level}`;

    stage.innerHTML = `
        <div class="score-display">Recorde: ${playerProgress.stacker.topScore} andares</div>
        <div class="stacker-container" id="st-container"></div>
        <button class="btn-stack" id="st-drop">EMPILHAR</button>
    `;

    const container = document.getElementById("st-container");
    const dropBtn = document.getElementById("st-drop");
    
    let currentFloor = 0;
    let blockWidth = 100;
    let blockSpeed = 4; 
    let direction = 1;
    let blockPosition = 0;
    let gameInterval;
    let lastLeft = 100; 
    
    const baseBlock = document.createElement("div");
    baseBlock.classList.add("stacker-block");
    baseBlock.style.width = `${blockWidth}px`;
    baseBlock.style.bottom = "0px";
    baseBlock.style.left = `${lastLeft}px`;
    container.appendChild(baseBlock);

    function spawnNextBlock() {
        currentFloor++;
        if (currentFloor > 12) { 
            alert("Torre Concluída! Subiu de Ranking.");
            playerProgress.stacker.level += 1;
            saveGameData();
            clearInterval(gameInterval);
            buildStackerGame(stage);
            return;
        }

        const block = document.createElement("div");
        block.classList.add("stacker-block");
        block.style.width = `${blockWidth}px`;
        block.style.bottom = `${currentFloor * 24}px`;
        block.style.left = "0px";
        container.appendChild(block);

        blockPosition = 0;
        direction = 1; 
        
        clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            blockPosition += direction * blockSpeed;
            if (blockPosition + blockWidth >= 280) {
                blockPosition = 280 - blockWidth;
                direction = -1; 
            } else if (blockPosition <= 0) {
                blockPosition = 0;
                direction = 1;  
            }
            block.style.left = `${blockPosition}px`;
        }, 20);
    }

    spawnNextBlock();

    dropBtn.addEventListener("click", () => {
        clearInterval(gameInterval); 
        const tolerancia = 18;
        const diferenca = Math.abs(blockPosition - lastLeft);

        if (diferenca > tolerancia) {
            playGameOverSound();
            alert(`Fim de jogo! Desalinhado no andar ${currentFloor}.`);
            if ((currentFloor - 1) > playerProgress.stacker.topScore) {
                playerProgress.stacker.topScore = currentFloor - 1;
                playerProgress.stacker.level = Math.floor((currentFloor - 1) / 3) + 1;
                saveGameData();
            }
            buildStackerGame(stage);
            return;
        }

        playClickSound();
        lastLeft = blockPosition; 
        blockSpeed += 0.5; 
        spawnNextBlock();
    });
}

/* ==========================================
   SISTEMA DE DOWNLOAD, COMPRESSÃO E UPLOAD DE AVATAR
   ========================================== */

// Força o clique no input oculto de arquivos abrindo a galeria nativa
function triggerAvatarUpload() {
    document.getElementById("avatar-input").click();
}

// Gerencia o arquivo selecionado após a permissão do usuário
function handleAvatarSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Garante que o arquivo de fato é uma imagem
    if (!file.type.match('image.*')) {
        alert("Por favor, selecione apenas arquivos de imagem!");
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
            // Cria um Canvas para redimensionar a imagem e economizar memória no LocalStorage
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            
            // Força o tamanho do avatar para um quadrado perfeito leve
            const targetSize = 150; 
            canvas.width = targetSize;
            canvas.height = targetSize;
            
            // Corta e centraliza a imagem no formato quadrado antes de desenhar
            let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;
            if (img.width > img.height) {
                srcWidth = img.height;
                srcX = (img.width - img.height) / 2;
            } else {
                srcHeight = img.width;
                srcY = (img.height - img.width) / 2;
            }

            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetSize, targetSize);
            
            // Converte o resultado para string compactada (JPG com 75% de qualidade)
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
            
            // Grava diretamente no registro do usuário logado dentro do banco global
            const userIndex = usersDatabase.findIndex(u => u.username === currentLoggedInUser);
            if (userIndex !== -1) {
                usersDatabase[userIndex].avatar = compressedBase64;
                localStorage.setItem("arcade_verse_users", JSON.stringify(usersDatabase));
                
                // Atualiza a interface em tempo real
                updateHubUI();
            }
        };
        
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

// [JOGO 6] IA SUPREMA - JOGO DA VELHA MINIMAX IMMORTAL
function buildTicTacToeGame(stage) {
    document.getElementById("current-game-title").innerText = "IA Suprema (Velha)";
    if(!playerProgress.tictactoe) playerProgress.tictactoe = { level: 0 };
    
    document.getElementById("game-current-stat").innerText = `Pontos: ${playerProgress.tictactoe.level}`;

    // Estado interno do Tabuleiro: 'X' (Player), 'O' (IA), '' (Vazio)
    let board = ['', '', '', '', '', '', '', '', ''];
    let isGameActive = true;

    stage.innerHTML = `
        <div class="score-display" id="ttt-status">Sua vez! Humano (X) vs IA (O)</div>
        <div class="ttt-board">
            ${board.map((_, i) => `<div class="ttt-cell" data-index="${i}"></div>`).join('')}
        </div>
    `;

    const cells = stage.querySelectorAll(".ttt-cell");
    const statusText = document.getElementById("ttt-status");

    const winConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
        [0, 4, 8], [2, 4, 6]             // Diagonais
    ];

    // Checa vencedor no estado atual
    function checkWinner(currentBoard) {
        for (let condition of winConditions) {
            const [a, b, c] = condition;
            if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
                return currentBoard[a];
            }
        }
        if (!currentBoard.includes('')) return 'tie';
        return null;
    }

    // ALGORITMO MINIMAX: Avalia recursivamente todas as jogadas possíveis
    function minimax(currentBoard, depth, isMaximizing) {
        let result = checkWinner(currentBoard);
        if (result === 'O') return 10 - depth; // IA ganha (quanto mais rápido melhor)
        if (result === 'X') return depth - 10; // Player ganha
        if (result === 'tie') return 0;        // Empate

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (currentBoard[i] === '') {
                    currentBoard[i] = 'O';
                    let score = minimax(currentBoard, depth + 1, false);
                    currentBoard[i] = '';
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (currentBoard[i] === '') {
                    currentBoard[i] = 'X';
                    let score = minimax(currentBoard, depth + 1, true);
                    currentBoard[i] = '';
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    // Encontra a melhor casa disponível para a Inteligência Artificial
    function getBestMove() {
        let bestScore = -Infinity;
        let move = null;

        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = 'O';
                let score = minimax(board, 0, false);
                board[i] = '';
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    function handleCellClick(e) {
        const index = parseInt(e.target.getAttribute("data-index"));

        if (board[index] !== '' || !isGameActive) return;

        // Rodada do Jogador
        playClickSound();
        board[index] = 'X';
        e.target.innerText = 'X';
        e.target.classList.add("player-x");

        if (evaluateGameStatus()) return;

        // Rodada da IA Computacional
        statusText.innerText = "IA pensando...";
        isGameActive = false; // Bloqueia cliques temporariamente

        setTimeout(() => {
            let aiMove = getBestMove();
            if (aiMove !== null) {
                playClickSound();
                board[aiMove] = 'O';
                const aiCell = cells[aiMove];
                aiCell.innerText = 'O';
                aiCell.classList.add("ai-o");
            }
            
            isGameActive = true;
            evaluateGameStatus();
        }, 400);
    }

    function evaluateGameStatus() {
        let winner = checkWinner(board);

        if (winner) {
            isGameActive = false;
            if (winner === 'O') {
                playGameOverSound();
                statusText.innerHTML = `<span style="color:var(--accent)">A IA VENCEU! Humano derrotado.</span>`;
            } else if (winner === 'X') {
                playClickSound();
                statusText.innerHTML = `<span style="color:#38ef7d">MILAGRE! Você venceu a IA.</span>`;
                playerProgress.tictactoe.level += 3; // Recompensa massiva
            } else {
                statusText.innerHTML = `<span style="color:var(--text-muted)">EMPATE! Você resistiu perfeitamente.</span>`;
                playerProgress.tictactoe.level += 1; // Empatar com essa IA já é um mérito!
            }
            saveGameData();
            
            // Botão para reiniciar a partida
            stage.innerHTML += `<button class="btn-stack" id="btn-restart-ttt" style="background:var(--secondary); margin-top:20px;">Jogar Novamente</button>`;
            document.getElementById("btn-restart-ttt").addEventListener("click", () => buildTicTacToeGame(stage));
            return true;
        }
        
        if (isGameActive) {
            statusText.innerText = "Sua vez! Faça sua jogada.";
        }
        return false;
    }

    cells.forEach(cell => cell.addEventListener("click", handleCellClick));
}

/* ==========================================
   SISTEMA DE ÁUDIO ATUALIZADO (VISIBILIDADE E EFEITOS)
   ========================================== */
let audioCtx = null;
let musicInterval = null;
let isMusicPlaying = false; // Controla o estado desejado da música

function startArcadeMusic() {
    isMusicPlaying = true;
    if (audioCtx || musicInterval) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playTone(freq, duration, type = "square", volume = 0.05) {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.value = freq;
        
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    const melody = [
        329.63, 392.00, 659.25, 523.25, 587.33, 783.99, 0, 392.00,
        440.00, 523.25, 698.46, 587.33, 523.25, 493.88, 392.00, 440.00
    ];
    
    let noteIndex = 0;

    musicInterval = setInterval(() => {
        if (audioCtx && audioCtx.state === 'suspended') return;

        let currentNote = melody[noteIndex];
        if (currentNote > 0) {
            let waveType = noteIndex % 4 === 0 ? "triangle" : "square";
            playTone(currentNote, 0.25, waveType, 0.02); // Volume levemente reduzido para focar nos efeitos
        }
        noteIndex = (noteIndex + 1) % melody.length;
    }, 150);
}

function stopArcadeMusic() {
    isMusicPlaying = false;
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
    if (audioCtx) { audioCtx.close().then(() => { audioCtx = null; }); }
}

// 🔊 EFEITO 1: Barulho de clique do botão (Rápido e agudo)
function playClickSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime); // Tom alto/agudo
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); // Muito rápido
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
}

// 💥 EFEITO 2: Som de Erro ou Derrota (Grave com queda de frequência)
function playGameOverSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth"; // Som mais agressivo de arcade
    osc.frequency.setValueAtTime(220, audioCtx.currentTime); // Começa grave
    osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.4); // Desce o tom dramaticamente
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// 🚪 CONTROLE DE VISIBILIDADE: Para o som ao sair do Chrome ou editores
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        // Se o usuário saiu da aba, pausa temporariamente o canal de áudio
        if (audioCtx && audioCtx.state === 'running') {
            audioCtx.suspend();
        }
    } else {
        // Se o usuário voltou e ele ESTÁ logado (isMusicPlaying ativo), retoma o áudio
        if (isMusicPlaying) {
            if (!audioCtx) {
                startArcadeMusic();
            } else if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }
    }
});
