/* =========================================================================
   BANCO DE DADOS LOCAL E CONFIGURAÇÕES INICIAIS (CORRIGIDO)
   ========================================================================= */
let usersDatabase = [];
let currentLoggedInUser = null;
let playerProgress = {};

const defaultProgress = {
    clicker: { level: 1, currentPoints: 0, requiredPoints: 50 },
    memory: { level: 1, recordStage: 1 },
    math: { level: 1, streak: 0 },
    reaction: { level: 1, bestTime: 9999 },
    stacker: { level: 1, topScore: 0 },
    tictactoe: { level: 0 }
};

// Inicialização segura do sistema
document.addEventListener("DOMContentLoaded", () => {
    loadAuthSystem();
    setupAuthEvents();
});

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
    showView("auth-view");
    document.getElementById("main-header").style.display = "none";
}

function setupAuthEvents() {
    // Formulário de Login
    document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const userIn = document.getElementById("login-user").value.trim();
        const passIn = document.getElementById("login-pass").value;

        const user = usersDatabase.find(u => u.username === userIn && u.password === passIn);
        if (user) {
            loginSuccess(user);
        } else {
            alert("Usuário ou senha incorretos!");
        }
    });

    // Formulário de Registro
    document.getElementById("register-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const userIn = document.getElementById("reg-user").value.trim();
        const passIn = document.getElementById("reg-pass").value;

        if (userIn.length < 3) return alert("O usuário deve ter ao menos 3 caracteres.");
        if (passIn.length < 4) return alert("A senha deve ter ao menos 4 caracteres.");

        const existing = usersDatabase.find(u => u.username === userIn);
        if (existing) return alert("Esse nome de usuário já está em uso!");

        const newUser = {
            username: userIn,
            password: passIn,
            avatar: null,
            progress: JSON.parse(JSON.stringify(defaultProgress))
        };

        usersDatabase.push(newUser);
        localStorage.setItem("arcade_verse_users", JSON.stringify(usersDatabase));
        alert("Conta criada com sucesso! Faça o login.");
        document.getElementById("register-form").reset();
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
    renderSuggestions();
}

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

function switchAccount() {
    logoutUser();
}

function saveGameData() {
    if (!currentLoggedInUser) return;
    const userIndex = usersDatabase.findIndex(u => u.username === currentLoggedInUser);
    if (userIndex !== -1) {
        usersDatabase[userIndex].progress = playerProgress;
        localStorage.setItem("arcade_verse_users", JSON.stringify(usersDatabase));
    }
}

/* =========================================================================
   GERENCIADOR DE INTERFACE (VIEWS & MENUS)
   ========================================================================= */
function showView(viewId) {
    document.querySelectorAll(".view-section").forEach(view => view.style.display = "none");
    document.getElementById(viewId).style.display = "block";
}

function toggleUserMenu() {
    const drawer = document.getElementById("user-menu-drawer");
    drawer.classList.toggle("open");
}

// Fecha o menu hambúrguer ao clicar fora dele
document.addEventListener("click", (e) => {
    const drawer = document.getElementById("user-menu-drawer");
    const trigger = document.getElementById("hamburger-trigger");
    if (drawer && drawer.classList.contains("open") && !drawer.contains(e.target) && !trigger.contains(e.target)) {
        drawer.classList.remove("open");
    }
});

function backToHub() {
    playClickSound();
    showView("hub-view");
    updateHubUI();
}

function updateHubUI() {
    if (!playerProgress.clicker) return;

    let totalLevels = playerProgress.clicker.level + 
                     playerProgress.memory.level + 
                     playerProgress.math.level + 
                     playerProgress.reaction.level + 
                     playerProgress.stacker.level +
                     (playerProgress.tictactoe ? playerProgress.tictactoe.level : 0);
                     
    let levelFinal = Math.max(0, totalLevels - 5);

    document.getElementById("drawer-username").innerText = currentLoggedInUser;
    document.getElementById("drawer-level").innerHTML = `<i class="fa-solid fa-crown"></i> Nível: ${levelFinal}`;

    // Renderização Inteligente da Imagem de Perfil
    const currentUserData = usersDatabase.find(u => u.username === currentLoggedInUser);
    const imgElement = document.getElementById("profile-img");
    const iconElement = document.getElementById("profile-icon");

    if (currentUserData && currentUserData.avatar) {
        imgElement.src = currentUserData.avatar;
        imgElement.style.display = "block";
        iconElement.style.display = "none";
    } else {
        imgElement.style.display = "none";
        iconElement.style.display = "block";
    }

    // Atualização das Barras de Progresso da Hub
    document.getElementById("hub-clicker-lvl").innerText = playerProgress.clicker.level;
    let pct1 = (playerProgress.clicker.currentPoints / playerProgress.clicker.requiredPoints) * 100;
    document.getElementById("hub-clicker-bar").style.width = `${Math.min(pct1, 100)}%`;

    document.getElementById("hub-memory-lvl").innerText = playerProgress.memory.level;
    document.getElementById("hub-memory-bar").style.width = `${Math.min((playerProgress.memory.level / 10) * 100, 100)}%`;

    document.getElementById("hub-math-lvl").innerText = playerProgress.math.level;
    document.getElementById("hub-math-bar").style.width = `${(playerProgress.math.streak / 5) * 100}%`;

    document.getElementById("hub-reaction-lvl").innerText = playerProgress.reaction.level;
    document.getElementById("hub-reaction-bar").style.width = playerProgress.reaction.bestTime < 9999 ? '100%' : '0%';

    document.getElementById("hub-stacker-lvl").innerText = playerProgress.stacker.level;
    document.getElementById("hub-stacker-bar").style.width = `${Math.min((playerProgress.stacker.topScore / 12) * 100, 100)}%`;

    document.getElementById("hub-tictactoe-lvl").innerText = playerProgress.tictactoe ? playerProgress.tictactoe.level : 0;
    document.getElementById("hub-tictactoe-bar").style.width = playerProgress.tictactoe ? `${Math.min(playerProgress.tictactoe.level * 10, 100)}%` : '0%';
}

/* =========================================================================
   SISTEMA DE DOWNLOAD, COMPRESSÃO E UPLOAD DE AVATAR
   ========================================================================= */
function triggerAvatarUpload() {
    document.getElementById("avatar-input").click();
}

function handleAvatarSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
        alert("Por favor, selecione apenas arquivos de imagem!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const targetSize = 150; 
            
            canvas.width = targetSize;
            canvas.height = targetSize;
            
            let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;
            if (img.width > img.height) {
                srcWidth = img.height;
                srcX = (img.width - img.height) / 2;
            } else {
                srcHeight = img.width;
                srcY = (img.height - img.width) / 2;
            }

            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetSize, targetSize);
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
            
            const userIndex = usersDatabase.findIndex(u => u.username === currentLoggedInUser);
            if (userIndex !== -1) {
                usersDatabase[userIndex].avatar = compressedBase64;
                localStorage.setItem("arcade_verse_users", JSON.stringify(usersDatabase));
                updateHubUI();
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/* =========================================================================
   SISTEMA DE INICIALIZAÇÃO DE JOGOS
   ========================================================================= */
let currentGameId = "";
function launchGame(gameId) {
    currentGameId = gameId;
    playClickSound();
    showView("game-container-view");
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
    loadGameFeedbackUI(); 
}

/* -------------------------------------------------------------------------
   [JOGO 1] CLICKER ESTELAR
   ------------------------------------------------------------------------- */
function buildClickerGame(stage) {
    document.getElementById("current-game-title").innerText = "Clicker Estelar";
    document.getElementById("game-current-stat").innerText = `Nível do Multiplicador: ${playerProgress.clicker.level}`;

    stage.innerHTML = `
        <div class="score-display">Energia Coletada: <span id="clicker-score">${playerProgress.clicker.currentPoints}</span> / <span id="clicker-req">${playerProgress.clicker.requiredPoints}</span></div>
        <button class="btn-clicker-action" id="action-clicker"><i class="fa-solid fa-bolt"></i></button>
    `;

    document.getElementById("action-clicker").addEventListener("click", () => {
        playClickSound();
        playerProgress.clicker.currentPoints += playerProgress.clicker.level * 2;
        
        if(playerProgress.clicker.currentPoints >= playerProgress.clicker.requiredPoints) {
            playerProgress.clicker.level += 1;
            playerProgress.clicker.currentPoints = 0;
            playerProgress.clicker.requiredPoints = Math.floor(playerProgress.clicker.requiredPoints * 1.6);
            triggerLevelUpEffects();
            document.getElementById("game-current-stat").innerText = `Nível do Multiplicador: ${playerProgress.clicker.level}`;
        }
        
        document.getElementById("clicker-score").innerText = playerProgress.clicker.currentPoints;
        document.getElementById("clicker-req").innerText = playerProgress.clicker.requiredPoints;
        saveGameData();
    });
}

/* -------------------------------------------------------------------------
   [JOGO 2] MEMÓRIA NEON
   ------------------------------------------------------------------------- */
function buildMemoryGame(stage) {
    document.getElementById("current-game-title").innerText = "Memória Neon";
    document.getElementById("game-current-stat").innerText = `Dificuldade Atual: Nível ${playerProgress.memory.level}`;

    const iconsPool = ["fa-gem", "fa-ghost", "fa-bomb", "fa-shield-halved", "fa-skull", "fa-dragon", "fa-flask", "fa-clover"];
    let pairsCount = Math.min(3 + Math.floor(playerProgress.memory.level / 2), 8);
    
    let selectedIcons = iconsPool.slice(0, pairsCount);
    let deck = [...selectedIcons, ...selectedIcons].sort(() => Math.random() - 0.5);

    stage.innerHTML = `
        <div class="score-display">Encontre os pares ocultos</div>
        <div class="memory-grid" style="grid-template-columns: repeat(${pairsCount > 4 ? 4 : pairsCount}, 1fr)"></div>
    `;

    const grid = stage.querySelector(".memory-grid");
    let flippedCards = [];
    let matchedPairs = 0;

    deck.forEach((icon, index) => {
        const card = document.createElement("div");
        card.classList.add("memory-card");
        card.dataset.icon = icon;
        card.innerHTML = `<div class="front"><i class="fa-solid ${icon}"></i></div><div class="back"></div>`;
        
        card.addEventListener("click", () => {
            if (flippedCards.length < 2 && !card.classList.contains("flipped") && !card.classList.contains("matched")) {
                playClickSound();
                card.classList.add("flipped");
                flippedCards.push(card);

                if (flippedCards.length === 2) {
                    if (flippedCards[0].dataset.icon === flippedCards[1].dataset.icon) {
                        flippedCards.forEach(c => c.classList.add("matched"));
                        flippedCards = [];
                        matchedPairs++;

                        if (matchedPairs === pairsCount) {
                            playerProgress.memory.level += 1;
                            saveGameData();
                            triggerLevelUpEffects();
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
        grid.appendChild(card);
    });
}

/* -------------------------------------------------------------------------
   [JOGO 3] MATEMÁTICA EXPRESS
   ------------------------------------------------------------------------- */
function buildMathGame(stage) {
    document.getElementById("current-game-title").innerText = "Matemática Express";
    document.getElementById("game-current-stat").innerText = `Nível de Conta: ${playerProgress.math.level}`;

    let range = playerProgress.math.level * 10;
    let n1 = Math.floor(Math.random() * range) + 1;
    let n2 = Math.floor(Math.random() * range) + 1;
    let operators = ['+', '-', '*'];
    let op = operators[Math.floor(Math.random() * (playerProgress.math.level > 2 ? 3 : 2))];

    let answer = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;
    let options = [answer, answer + Math.floor(Math.random() * 5) + 1, answer - Math.floor(Math.random() * 5) - 1].sort(() => Math.random() - 0.5);

    stage.innerHTML = `
        <div class="score-display">Combo Acertos: ${playerProgress.math.streak} / 5</div>
        <div class="math-question">${n1} ${op} ${n2} = ?</div>
        <div class="math-options-container">
            ${options.map(opt => `<button class="btn-math-option" data-val="${opt}">${opt}</button>`).join('')}
        </div>
    `;

    stage.querySelectorAll(".btn-math-option").forEach(btn => {
        btn.addEventListener("click", () => {
            let opt = parseInt(btn.getAttribute("data-val"));
            if(opt === answer) {
                playClickSound();
                playerProgress.math.streak += 1;
                if(playerProgress.math.streak >= 5) {
                    playerProgress.math.level += 1;
                    playerProgress.math.streak = 0;
                    triggerLevelUpEffects();
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

/* -------------------------------------------------------------------------
   [JOGO 4] REFLEXO NINJA
   ------------------------------------------------------------------------- */
function buildReactionGame(stage) {
    document.getElementById("current-game-title").innerText = "Reflexo Ninja";
    let displayTime = playerProgress.reaction.bestTime === 9999 ? "Nenhum" : `${playerProgress.reaction.bestTime}ms`;
    document.getElementById("game-current-stat").innerText = `Melhor Tempo: ${displayTime}`;

    stage.innerHTML = `
        <div class="score-display">Espere o painel ficar verde e clique o mais rápido possível!</div>
        <div id="reaction-zone" class="zone-action zone-waiting">AGUARDE...</div>
    `;

    const zone = document.getElementById("reaction-zone");
    let state = "waiting"; 
    let startTime, timeoutId;

    let delay = Math.random() * 3000 + 2000;
    timeoutId = setTimeout(() => {
        state = "ready";
        zone.innerText = "CLIQUE AGORA!";
        zone.classList.replace("zone-waiting", "zone-result");
        startTime = window.performance.now();
    }, delay);

    zone.addEventListener("click", () => {
        if (state === "idle") {
            playClickSound();
            buildReactionGame(stage);
        } else if (state === "waiting") {
            clearTimeout(timeoutId);
            playGameOverSound();
            state = "idle";
            zone.innerText = "MUITO CEDO! Clique para tentar novamente.";
            zone.classList.replace("zone-waiting", "zone-early");
        } else if (state === "ready") {
            playClickSound();
            let reactionTime = Math.round(window.performance.now() - startTime);
            state = "idle";
            
            if(reactionTime < playerProgress.reaction.bestTime) {
                playerProgress.reaction.bestTime = reactionTime;
                playerProgress.reaction.level += 1;
                triggerLevelUpEffects();
                saveGameData();
            }
            zone.innerText = `Seu tempo: ${reactionTime}ms! Clique para reiniciar.`;
        }
    });
}

/* -------------------------------------------------------------------------
   [JOGO 5] EMPILHADOR MODERNO
   ------------------------------------------------------------------------- */
function buildStackerGame(stage) {
    document.getElementById("current-game-title").innerText = "Empilhador Moderno";
    document.getElementById("game-current-stat").innerText = `Recorde de Blocos: ${playerProgress.stacker.topScore}`;

    stage.innerHTML = `
        <div class="score-display">Andar Atual: <span id="stack-floor">1</span> / 12</div>
        <div class="stacker-frame">
            <div id="stacker-arena"></div>
        </div>
        <button class="btn-stack" id="btn-stack-drop">SOLTAR BLOCO</button>
    `;

    const arena = document.getElementById("stacker-arena");
    const dropBtn = document.getElementById("btn-stack-drop");

    let currentFloor = 1;
    let blockPosition = 0;
    let direction = 1; 
    let blockSpeed = 15;
    let lastLeft = 60; 
    let gameInterval;

    function spawnNextBlock() {
        document.getElementById("stack-floor").innerText = currentFloor;
        
        /* =========================================================================
   SISTEMA COGNITIVO DE FEEDBACK, CHAT E SUGESTÕES GERAIS
   ========================================================================= */

// Inicializa os bancos de dados compartilhados no localStorage se não existirem
if (!localStorage.getItem("arcade_verse_feedback")) {
    localStorage.setItem("arcade_verse_feedback", JSON.stringify({}));
}
if (!localStorage.getItem("arcade_verse_suggestions")) {
    localStorage.setItem("arcade_verse_suggestions", JSON.stringify([]));
}

// Carrega os dados de Feedback (Likes e Comentários) do Jogo Aberto
function loadGameFeedbackUI() {
    if (!currentGameId) return;

    const globalFeedback = JSON.parse(localStorage.getItem("arcade_verse_feedback"));
    
    // Se o jogo não tiver registro ainda, cria a estrutura dele
    if (!globalFeedback[currentGameId]) {
        globalFeedback[currentGameId] = { likes: [], dislikes: [], comments: [] };
    }

    const gameData = globalFeedback[currentGameId];

    // Atualiza contadores de likes na tela
    document.getElementById("txt-like-pos").innerText = gameData.likes.length;
    document.getElementById("txt-like-neg").innerText = gameData.dislikes.length;

    // Colore o botão se o jogador atual já tiver votado
    document.getElementById("btn-like-pos").classList.toggle("active", gameData.likes.includes(currentLoggedInUser));
    document.getElementById("btn-like-neg").classList.toggle("active", gameData.dislikes.includes(currentLoggedInUser));

    // Renderiza a lista de comentários
    const commentsBox = document.getElementById("comments-box");
    commentsBox.innerHTML = gameData.comments.map(c => `
        <div class="comment-item">
            <div class="author"><i class="fa-solid fa-user"></i> ${c.user}</div>
            <div class="text">${c.text}</div>
        </div>
    `).join('');
    
    // Rola o chat de comentários para o final automaticamente
    commentsBox.scrollTop = commentsBox.scrollHeight;
}

// Processa a votação de Like / Dislike
function submitGameVote(isLike) {
    playClickSound();
    const globalFeedback = JSON.parse(localStorage.getItem("arcade_verse_feedback"));
    const gameData = globalFeedback[currentGameId];

    const user = currentLoggedInUser;

    if (isLike) {
        // Se já deu like, remove. Se não, adiciona e remove do dislike.
        if (gameData.likes.includes(user)) {
            gameData.likes = gameData.likes.filter(u => u !== user);
        } else {
            gameData.likes.push(user);
            gameData.dislikes = gameData.dislikes.filter(u => u !== user);
        }
    } else {
        // Se já deu dislike, remove. Se não, adiciona e remove do like.
        if (gameData.dislikes.includes(user)) {
            gameData.dislikes = gameData.dislikes.filter(u => u !== user);
        } else {
            gameData.dislikes.push(user);
            gameData.likes = gameData.likes.filter(u => u !== user);
        }
    }

    localStorage.setItem("arcade_verse_feedback", JSON.stringify(globalFeedback));
    loadGameFeedbackUI();
}

// Processa o envio de Comentário no Chat do Jogo
function submitGameComment(event) {
    event.preventDefault();
    playClickSound();

    const input = document.getElementById("input-comment");
    const text = input.value.trim();
    if (!text) return;

    const globalFeedback = JSON.parse(localStorage.getItem("arcade_verse_feedback"));
    
    // Adiciona o novo comentário ao banco
    globalFeedback[currentGameId].comments.push({
        user: currentLoggedInUser,
        text: text
    });

    localStorage.setItem("arcade_verse_feedback", JSON.stringify(globalFeedback));
    input.value = ""; // Limpa a barra de texto
    loadGameFeedbackUI();
}

// Processa o envio de Sugestão Geral (No Hub)
function submitGeneralSuggestion(event) {
    event.preventDefault();
    playClickSound();

    const input = document.getElementById("input-suggestion");
    const text = input.value.trim();
    if (!text) return;

    const suggestions = JSON.parse(localStorage.getItem("arcade_verse_suggestions"));
    
    // Insere a nova sugestão na lista
    suggestions.unshift({
        user: currentLoggedInUser,
        text: text
    });

    localStorage.setItem("arcade_verse_suggestions", JSON.stringify(suggestions));
    input.value = ""; // Limpa campo
    renderSuggestions();
}

// Renderiza a lista de sugestões gerais na tela
function renderSuggestions() {
    const listContainer = document.getElementById("suggestions-list");
    if (!listContainer) return;

    const suggestions = JSON.parse(localStorage.getItem("arcade_verse_suggestions"));

    if (suggestions.length === 0) {
        listContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.9rem;">Nenhuma sugestão enviada ainda. Seja o primeiro!</p>`;
        return;
    }

    listContainer.innerHTML = suggestions.map(s => `
        <div class="suggestion-item">
            <div class="author" style="color: #ffd700; font-size: 0.85rem; font-weight: bold;"><i class="fa-solid fa-lightbulb"></i> ${s.user} sugeriu:</div>
            <div class="text" style="color: #fff; margin-top: 2px;">${s.text}</div>
        </div>
    `).join('');
}
