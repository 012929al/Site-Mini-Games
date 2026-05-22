/* =========================================================================
   BANCO DE DADOS LOCAL E CONFIGURAÇÕES INICIAIS (BLINDADO)
   ========================================================================= */
let usersDatabase = [];
let currentLoggedInUser = null;
let playerProgress = {};
let currentGameId = ""; 

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
    // Inicializa as bases do localStorage antes de rodar os validadores de tela
    if (!localStorage.getItem("arcade_verse_feedback")) {
        localStorage.setItem("arcade_verse_feedback", JSON.stringify({}));
    }
    if (!localStorage.getItem("arcade_verse_suggestions")) {
        localStorage.setItem("arcade_verse_suggestions", JSON.stringify([]));
    }

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
    const header = document.getElementById("main-header");
    if (header) header.style.display = "none";
}

function setupAuthEvents() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
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
    }

    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
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
            registerForm.reset();
        });
    }
}

function loginSuccess(user) {
    currentLoggedInUser = user.username;
    playerProgress = user.progress || JSON.parse(JSON.stringify(defaultProgress));
    
    localStorage.setItem("arcade_verse_session", user.username);
    
    const header = document.getElementById("main-header");
    if (header) header.style.display = "flex";
    
    showView("hub-view");
    updateHubUI();
    renderSuggestions();
    startArcadeMusic();
}

function logoutUser() {
    stopArcadeMusic();
    localStorage.removeItem("arcade_verse_session");
    currentLoggedInUser = null;
    playerProgress = {};
    
    const drawer = document.getElementById("user-menu-drawer");
    const header = document.getElementById("main-header");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    if (drawer) drawer.classList.remove("open");
    if (header) header.style.display = "none";
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    
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
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.style.display = "block";
}

function toggleUserMenu() {
    const drawer = document.getElementById("user-menu-drawer");
    if (drawer) drawer.classList.toggle("open");
}

document.addEventListener("click", (e) => {
    const drawer = document.getElementById("user-menu-drawer");
    const trigger = document.getElementById("hamburger-trigger");
    if (drawer && drawer.classList.contains("open") && !drawer.contains(e.target) && trigger && !trigger.contains(e.target)) {
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

    let totalLevels = (playerProgress.clicker.level || 1) + 
                     (playerProgress.memory.level || 1) + 
                     (playerProgress.math.level || 1) + 
                     (playerProgress.reaction.level || 1) + 
                     (playerProgress.stacker.level || 1) +
                     (playerProgress.tictactoe ? playerProgress.tictactoe.level : 0);
                     
    let levelFinal = Math.max(0, totalLevels - 5);

    const dUser = document.getElementById("drawer-username");
    const dLvl = document.getElementById("drawer-level");
    if (dUser) dUser.innerText = currentLoggedInUser;
    if (dLvl) dLvl.innerHTML = `<i class="fa-solid fa-crown"></i> Nível: ${levelFinal}`;

    const currentUserData = usersDatabase.find(u => u.username === currentLoggedInUser);
    const imgElement = document.getElementById("profile-img");
    const iconElement = document.getElementById("profile-icon");

    if (imgElement && iconElement) {
        if (currentUserData && currentUserData.avatar) {
            imgElement.src = currentUserData.avatar;
            imgElement.style.display = "block";
            iconElement.style.display = "none";
        } else {
            imgElement.style.display = "none";
            iconElement.style.display = "block";
        }
    }

    // Atualização Segura das Barras da Hub
    const hClickerLvl = document.getElementById("hub-clicker-lvl");
    const hClickerBar = document.getElementById("hub-clicker-bar");
    if (hClickerLvl && hClickerBar) {
        hClickerLvl.innerText = playerProgress.clicker.level;
        let pct = (playerProgress.clicker.currentPoints / playerProgress.clicker.requiredPoints) * 100;
        hClickerBar.style.width = `${Math.min(pct, 100)}%`;
    }

    const hMemoryLvl = document.getElementById("hub-memory-lvl");
    const hMemoryBar = document.getElementById("hub-memory-bar");
    if (hMemoryLvl && hMemoryBar) {
        hMemoryLvl.innerText = playerProgress.memory.level;
        hMemoryBar.style.width = `${Math.min((playerProgress.memory.level / 10) * 100, 100)}%`;
    }

    const hMathLvl = document.getElementById("hub-math-lvl");
    const hMathBar = document.getElementById("hub-math-bar");
    if (hMathLvl && hMathBar) {
        hMathLvl.innerText = playerProgress.math.level;
        hMathBar.style.width = `${(playerProgress.math.streak / 5) * 100}%`;
    }

    const hReactionLvl = document.getElementById("hub-reaction-lvl");
    const hReactionBar = document.getElementById("hub-reaction-bar");
    if (hReactionLvl && hReactionBar) {
        hReactionLvl.innerText = playerProgress.reaction.level;
        hReactionBar.style.width = playerProgress.reaction.bestTime < 9999 ? '100%' : '0%';
    }

    const hStackerLvl = document.getElementById("hub-stacker-lvl");
    const hStackerBar = document.getElementById("hub-stacker-bar");
    if (hStackerLvl && hStackerBar) {
        hStackerLvl.innerText = playerProgress.stacker.level;
        hStackerBar.style.width = `${Math.min((playerProgress.stacker.topScore / 12) * 100, 100)}%`;
    }

    const hTictactoeLvl = document.getElementById("hub-tictactoe-lvl");
    const hTictactoeBar = document.getElementById("hub-tictactoe-bar");
    if (hTictactoeLvl && hTictactoeBar) {
        hTictactoeLvl.innerText = playerProgress.tictactoe ? playerProgress.tictactoe.level : 0;
        hTictactoeBar.style.width = playerProgress.tictactoe ? `${Math.min(playerProgress.tictactoe.level * 10, 100)}%` : '0%';
    }
}

function triggerAvatarUpload() {
    const input = document.getElementById("avatar-input");
    if (input) input.click();
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
   SISTEMA DE MÁQUINAS DE JOGOS
   ========================================================================= */
function launchGame(gameId) {
    currentGameId = gameId;
    playClickSound();
    showView("game-container-view");
    const stage = document.getElementById("game-stage");
    if (!stage) return;
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
        <div class="memory-grid" style="grid-template-columns: repeat(${pairsCount > 4 ? 4 : pairsCount}, 1fr); display:grid; gap:10px; max-width:400px; margin:0 auto;"></div>
    `;

    const grid = stage.querySelector(".memory-grid");
    let flippedCards = [];
    let matchedPairs = 0;

    deck.forEach((icon) => {
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
                            stage.innerHTML += `<div class="success-banner" style="text-align:center; margin-top:15px; color:#38ef7d; font-weight:bold;">FASE COMPLETA! Próxima...</div>`;
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
        <div class="math-question" style="font-size:2rem; text-align:center; margin:20px 0; font-weight:bold; color:#00f2fe;">${n1} ${op} ${n2} = ?</div>
        <div class="math-options-container" style="display:flex; gap:10px; justify-content:center;">
            ${options.map(opt => `<button class="btn-math-option" data-val="${opt}" style="padding:10px 20px; font-size:1.2rem; cursor:pointer;">${opt}</button>`).join('')}
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
        <div id="reaction-zone" class="zone-action zone-waiting" style="width:100%; max-width:400px; height:200px; margin:20px auto; display:flex; align-items:center; justify-content:center; font-weight:bold; cursor:pointer; border-radius:12px;">AGUARDE...</div>
    `;

    const zone = document.getElementById("reaction-zone");
    let state = "waiting"; 
    let startTime, timeoutId;

    let delay = Math.random() * 3000 + 2000;
    timeoutId = setTimeout(() => {
        state = "ready";
        zone.innerText = "CLIQUE AGORA!";
     