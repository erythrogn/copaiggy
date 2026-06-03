import { AppState } from './state.js';

class Vector2D {
    constructor(x, y) { this.x = x; this.y = y; }
    add(vector) { this.x += vector.x; this.y += vector.y; }
    multiply(scalar) { this.x *= scalar; this.y *= scalar; }
}

class ConfettiParticle {
    constructor(x, y, context) {
        this.context = context;
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D((Math.random() - 0.5) * 22, (Math.random() - 1) * 28);
        this.gravity = new Vector2D(0, 0.6);
        this.friction = 0.98;
        this.size = Math.random() * 10 + 6;
        const colors = ['#00d64d', '#2b70ff', '#ffd000', '#ff2a55', '#ffffff', '#c073ff', '#ff8c2b'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 12;
        this.opacity = 1;
        this.decay = Math.random() * 0.015 + 0.01;
    }
    update() {
        this.velocity.add(this.gravity);
        this.velocity.multiply(this.friction);
        this.position.add(this.velocity);
        this.rotation += this.rotationSpeed;
        this.opacity -= this.decay;
    }
    draw() {
        this.context.save();
        this.context.translate(this.position.x, this.position.y);
        this.context.rotate((this.rotation * Math.PI) / 180);
        this.context.globalAlpha = Math.max(0, this.opacity);
        this.context.fillStyle = this.color;
        this.context.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        this.context.restore();
    }
    isDead() { return this.opacity <= 0 || this.position.y > window.innerHeight; }
}

class ConfettiEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext('2d');
        this.particles = [];
        this.isRunning = false;
        this.resizeHandler = this.resize.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        this.resize();
    }
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    burst(x, y, count = 70) {
        for (let i = 0; i < count; i++) this.particles.push(new ConfettiParticle(x, y, this.context));
        if (!this.isRunning) { this.isRunning = true; this.loop(); }
    }
    loop() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(); p.draw();
            if (p.isDead()) this.particles.splice(i, 1);
        }
        if (this.particles.length > 0) requestAnimationFrame(this.loop.bind(this));
        else { this.isRunning = false; this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); }
    }
}

class UIManager {
    constructor(stateManager, confettiEngine) {
        this.stateManager = stateManager;
        this.confetti = confettiEngine;
        this.expandedTeams = new Set();
        this.isAuthenticated = false;
        
        this.elements = {
            tabs: document.querySelectorAll('.tab-button'),
            views: document.querySelectorAll('.view-container'),
            adminAuthCard: document.getElementById('admin-auth-card'),
            adminContentWrap: document.getElementById('admin-content-wrap'),
            inputAdminPass: document.getElementById('input-admin-pass'),
            btnAdminLogin: document.getElementById('btn-admin-login'),
            inputNewTeamName: document.getElementById('input-new-team-name'),
            selectNewTeamTheme: document.getElementById('select-new-team-theme'),
            selectNewTeamIcon: document.getElementById('select-new-team-icon'),
            btnAddTeam: document.getElementById('btn-add-team'),
            teamsAdminList: document.getElementById('teams-admin-list'),
            inputPlayerName: document.getElementById('input-player-name'),
            selectPlayerTeam: document.getElementById('select-player-team'),
            btnAddPlayer: document.getElementById('btn-add-player'),
            playersAdminList: document.getElementById('players-list-admin'),
            scoreboardTopContainer: document.getElementById('scoreboard-top-container'),
            teamCardsGrid: document.getElementById('team-cards-grid'),
            displayTotal: document.getElementById('display-total-score'),
            logList: document.getElementById('log-list'),
            btnResetAll: document.getElementById('btn-reset-all'),
            toastRoot: document.getElementById('toast-root'),
            modalRoot: document.getElementById('modal-root')
        };
        
        this.checkAuth();
        this.bindEvents();
        this.stateManager.subscribe(this.handleStateChange.bind(this));
    }

    checkAuth() {
        const isAuth = sessionStorage.getItem('dimen6_auth') === 'true';
        if (isAuth) {
            this.isAuthenticated = true;
            this.elements.adminAuthCard.style.display = 'none';
            this.elements.adminContentWrap.style.display = 'flex';
        } else {
            this.isAuthenticated = false;
            this.elements.adminAuthCard.style.display = 'flex';
            this.elements.adminContentWrap.style.display = 'none';
        }
    }

    handleLogin() {
        const pass = this.elements.inputAdminPass.value;
        if (pass === 'dimen6') {
            sessionStorage.setItem('dimen6_auth', 'true');
            this.elements.inputAdminPass.value = '';
            this.showToast('Acesso concedido.', 'success');
            
            gsap.to(this.elements.adminAuthCard, {
                opacity: 0, scale: 0.95, duration: 0.3, onComplete: () => {
                    this.checkAuth();
                    gsap.from(this.elements.adminContentWrap.children, {
                        y: 20, opacity: 0, duration: 0.4, stagger: 0.1, ease: "power2.out"
                    });
                }
            });
        } else {
            this.showToast('Credencial inválida.', 'danger');
            this.elements.inputAdminPass.value = '';
            gsap.fromTo(this.elements.adminAuthCard, 
                { x: -10 }, { x: 10, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => gsap.set(this.elements.adminAuthCard, {x: 0}) }
            );
        }
    }

    bindEvents() {
        this.elements.tabs.forEach(tab => tab.addEventListener('click', (e) => this.switchTab(e.currentTarget)));
        
        this.elements.btnAdminLogin.addEventListener('click', () => this.handleLogin());
        this.elements.inputAdminPass.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        this.elements.btnAddTeam.addEventListener('click', () => {
            const name = this.elements.inputNewTeamName.value.trim();
            const theme = this.elements.selectNewTeamTheme.value;
            const icon = this.elements.selectNewTeamIcon.value;
            if (name) {
                this.stateManager.addTeam(name, theme, icon);
                this.elements.inputNewTeamName.value = '';
                this.showToast(`Equipe ${name} criada.`, 'success');
            } else this.showToast('Informe o nome da equipe.', 'danger');
        });

        const addPlayerHandler = () => {
            const name = this.elements.inputPlayerName.value.trim();
            const teamId = this.elements.selectPlayerTeam.value;
            if (name && teamId) {
                this.stateManager.addPlayer(name, teamId);
                this.elements.inputPlayerName.value = '';
                this.elements.inputPlayerName.focus();
                this.showToast(`Jogador recrutado.`, 'success');
            } else {
                this.showToast('Preencha os dados do jogador.', 'danger');
            }
        };
        
        this.elements.btnAddPlayer.addEventListener('click', addPlayerHandler);
        this.elements.inputPlayerName.addEventListener('keypress', (e) => { if (e.key === 'Enter') addPlayerHandler(); });
        
        this.elements.btnResetAll.addEventListener('click', () => {
            this.showModal('Atenção Crítica', 'Tem certeza que deseja zerar completamente o placar e histórico? Esta ação é irreversível.', () => {
                this.stateManager.resetAll();
                this.showToast('Placar reiniciado com sucesso.', 'success');
            });
        });
    }

    handleStateChange(event, data, state) {
        if (event === 'REMOTE_SYNC' || event === 'STRUCTURE_CHANGED') {
            this.fullRender(state);
            return;
        }
        if (event === 'SCORE_CHANGED') {
            this.updateScoreboardsDOM(state);
            this.sortPlayersInCards(state);
            this.fullRenderLogs(state);
            this.animateScorePulse(data.player.teamId);
            if(data.logEntry) this.triggerConfetti();
        }
    }

    fullRender(state) {
        this.fullRenderTeamsAdmin(state);
        this.fullRenderPlayerSelect(state);
        this.fullRenderPlayersAdmin(state);
        this.fullRenderScoreboard(state);
        this.updateScoreboardsDOM(state);
        this.sortPlayersInCards(state, false);
        this.fullRenderLogs(state);
    }

    fullRenderTeamsAdmin(state) {
        this.elements.teamsAdminList.innerHTML = '';
        if (state.teams.length === 0) {
            this.renderEmptyState(this.elements.teamsAdminList, 'Nenhuma equipe configurada.');
            return;
        }
        state.teams.forEach(team => {
            const item = this.createElement('div', ['list-item', team.theme]);
            const avatar = this.createElement('div', ['avatar', 'dyn-border', 'dyn-bg', 'dyn-color']);
            avatar.appendChild(this.createSVGIcon(team.icon, '20'));
            const info = this.createElement('div', ['item-info']);
            const nameEl = this.createElement('span', ['item-name', 'dyn-color']); nameEl.textContent = team.name;
            info.appendChild(nameEl);
            const btn = this.createElement('button', ['btn-icon', 'danger'], { title: 'Remover Equipe' });
            btn.appendChild(this.createSVGIcon('trash', '18'));
            btn.addEventListener('click', () => {
                this.showModal('Confirmar Deleção', `Remover a equipe ${team.name} e todos os seus jogadores da competição?`, () => this.stateManager.removeTeam(team.id));
            });
            item.append(avatar, info, btn);
            this.elements.teamsAdminList.appendChild(item);
        });
        if(this.isAuthenticated) {
            gsap.from(this.elements.teamsAdminList.children, { y: 20, opacity: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" });
        }
    }

    fullRenderPlayerSelect(state) {
        this.elements.selectPlayerTeam.innerHTML = '';
        state.teams.forEach(team => {
            const opt = document.createElement('option');
            opt.value = team.id;
            opt.textContent = team.name;
            this.elements.selectPlayerTeam.appendChild(opt);
        });
    }

    fullRenderPlayersAdmin(state) {
        this.elements.playersAdminList.innerHTML = '';
        if (state.players.length === 0) {
            this.renderEmptyState(this.elements.playersAdminList, 'O elenco está vazio.');
            return;
        }
        state.players.forEach(player => {
            const team = state.teams.find(t => t.id === player.teamId);
            if (!team) return;
            const item = this.createElement('div', ['list-item', team.theme]);
            const avatar = this.createElement('div', ['avatar', 'dyn-border', 'dyn-bg', 'dyn-color']);
            avatar.appendChild(this.createSVGIcon('user', '20'));
            const info = this.createElement('div', ['item-info']);
            const nameEl = this.createElement('span', ['item-name']); nameEl.textContent = player.name;
            const tag = this.createElement('span', ['tag', 'dyn-bg', 'dyn-color']); tag.textContent = team.name;
            info.append(nameEl, tag);
            const score = this.createElement('span', ['item-score']); score.textContent = player.score;
            const btn = this.createElement('button', ['btn-icon', 'danger'], { title: 'Remover Jogador' });
            btn.appendChild(this.createSVGIcon('trash', '18'));
            btn.addEventListener('click', () => this.stateManager.removePlayer(player.id));
            item.append(avatar, info, score, btn);
            this.elements.playersAdminList.appendChild(item);
        });
        if(this.isAuthenticated) {
            gsap.from(this.elements.playersAdminList.children, { x: -20, opacity: 0, duration: 0.3, stagger: 0.04, ease: "power2.out" });
        }
    }

    toggleTeamCollapse(id) {
        const wrap = document.getElementById(`collapse-${id}`);
        const chevron = document.getElementById(`chevron-${id}`);
        if (!wrap) return;

        const isExpanded = this.expandedTeams.has(id);
        if (isExpanded) {
            this.expandedTeams.delete(id);
            gsap.to(wrap, { 
                height: 0, 
                opacity: 0, 
                duration: 0.3, 
                ease: 'power2.inOut', 
                onComplete: () => { wrap.style.display = 'none'; } 
            });
            if(chevron) gsap.to(chevron, { rotation: 0, duration: 0.3 });
        } else {
            this.expandedTeams.add(id);
            wrap.style.display = 'block';
            gsap.set(wrap, { height: 'auto' });
            const targetHeight = wrap.offsetHeight;
            gsap.fromTo(wrap, { height: 0, opacity: 0 }, { 
                height: targetHeight, 
                opacity: 1, 
                duration: 0.3, 
                ease: 'power2.out', 
                onComplete: () => { wrap.style.height = 'auto'; } 
            });
            if(chevron) gsap.to(chevron, { rotation: 180, duration: 0.3 });
        }
    }

    fullRenderScoreboard(state) {
        this.elements.scoreboardTopContainer.innerHTML = '';
        this.elements.teamCardsGrid.innerHTML = '';
        
        if (state.teams.length === 0) return;

        state.teams.forEach(team => {
            const topDisp = this.createElement('div', ['team-display', team.theme]);
            const shield = this.createElement('div', ['shield', 'dyn-border', 'dyn-color', 'dyn-glow']);
            shield.appendChild(this.createSVGIcon(team.icon, '40'));
            const nameDisp = this.createElement('div', ['team-name-display', 'dyn-color']); nameDisp.textContent = team.name;
            const scoreDisp = this.createElement('div', ['score-number', 'dyn-color'], { id: `score-top-${team.id}` }); scoreDisp.textContent = '0';
            topDisp.append(shield, nameDisp, scoreDisp);
            this.elements.scoreboardTopContainer.appendChild(topDisp);

            const card = this.createElement('div', ['card', team.theme]);
            const cardBg = this.createElement('div', ['dyn-gradient-bg']);
            cardBg.style.cssText = "position: absolute; top:0; left:0; width:100%; height:100%; z-index:0; opacity: 0.4; pointer-events: none;";
            card.appendChild(cardBg);

            const header = this.createElement('div', ['card-header', 'dyn-border-bottom']);
            header.addEventListener('click', () => this.toggleTeamCollapse(team.id));

            const titleGroup = this.createElement('div', ['card-title-group']);
            const svgIcon = this.createSVGIcon(team.icon, '20');
            svgIcon.classList.add('dyn-color');
            const title = this.createElement('h2', ['card-title', 'dyn-color']); title.textContent = team.name;
            titleGroup.append(svgIcon, title);
            
            const rightGroup = this.createElement('div');
            rightGroup.style.display = 'flex';
            rightGroup.style.alignItems = 'center';
            rightGroup.style.gap = 'var(--space-4)';
            
            const teamTotal = this.createElement('div', ['card-team-total'], { id: `card-total-${team.id}` }); teamTotal.textContent = '0';
            const chevron = this.createSVGIcon('chevron', '24');
            chevron.id = `chevron-${team.id}`;
            chevron.classList.add('dyn-color');
            chevron.style.transition = 'transform 0.3s ease';
            
            rightGroup.append(teamTotal, chevron);
            header.append(titleGroup, rightGroup);
            
            const listWrap = this.createElement('div', ['card-collapse-wrap'], { id: `collapse-${team.id}` });
            listWrap.style.overflow = 'hidden';
            
            if (this.expandedTeams.has(team.id)) {
                listWrap.style.height = 'auto';
                listWrap.style.opacity = '1';
                listWrap.style.display = 'block';
                chevron.style.transform = 'rotate(180deg)';
            } else {
                listWrap.style.height = '0px';
                listWrap.style.opacity = '0';
                listWrap.style.display = 'none';
                chevron.style.transform = 'rotate(0deg)';
            }
            
            const list = this.createElement('div', ['list-container'], { id: `list-score-${team.id}` });
            
            const teamPlayers = state.players.filter(p => p.teamId === team.id);
            if(teamPlayers.length === 0) {
                const empty = this.createElement('div', ['empty-state']);
                empty.appendChild(this.createSVGIcon('ghost', '32'));
                const emptyTxt = this.createElement('span'); emptyTxt.textContent = 'Sem escalação';
                empty.appendChild(emptyTxt);
                list.appendChild(empty);
            } else {
                teamPlayers.forEach((player, index) => {
                    const row = this.createElement('div', ['player-score-row'], { 'data-player-id': player.id });
                    
                    const scoreBar = this.createElement('div', ['score-bar', 'dyn-bg'], { id: `score-bar-${player.id}` });
                    const pRank = this.createElement('span', ['psr-rank'], { id: `rank-${player.id}` }); pRank.textContent = index + 1;
                    const pName = this.createElement('span', ['psr-name']); 
                    pName.textContent = player.name;
                    const crown = this.createElement('span', ['mvp-icon'], { id: `mvp-${player.id}` });
                    crown.appendChild(this.createSVGIcon('crown', '16'));
                    pName.appendChild(crown);

                    const pScore = this.createElement('span', ['psr-score'], { id: `score-val-${player.id}` }); pScore.textContent = player.score;
                    
                    const btnMinus = this.createElement('button', ['btn-action'], { title: 'Remover dose' });
                    btnMinus.appendChild(this.createSVGIcon('minus'));
                    btnMinus.addEventListener('click', () => this.stateManager.decrementScore(player.id));
                    
                    const btnPlus = this.createElement('button', ['btn-action', 'dyn-color', 'dyn-border-solid'], { title: 'Marcar dose' });
                    btnPlus.appendChild(this.createSVGIcon('plus'));
                    btnPlus.addEventListener('click', () => this.stateManager.incrementScore(player.id));
                    
                    row.append(scoreBar, pRank, pName, pScore, btnMinus, btnPlus);
                    list.appendChild(row);
                });
            }
            listWrap.appendChild(list);
            card.append(header, listWrap);
            this.elements.teamCardsGrid.appendChild(card);
        });

        gsap.from(this.elements.scoreboardTopContainer.children, { scale: 0.8, opacity: 0, duration: 0.5, stagger: 0.1, ease: "back.out(1.5)" });
        gsap.from(this.elements.teamCardsGrid.children, { y: 30, opacity: 0, duration: 0.5, stagger: 0.1, ease: "power2.out", delay: 0.2 });
    }

    updateScoreboardsDOM(state) {
        let total = 0;
        let maxTeamScore = -1;
        let maxPlayerScore = -1;
        const scores = {};
        const maxPerTeam = {};

        state.teams.forEach(t => { scores[t.id] = 0; maxPerTeam[t.id] = 0; });
        
        state.players.forEach(p => {
            if(scores[p.teamId] !== undefined) scores[p.teamId] += p.score;
            if(p.score > maxPerTeam[p.teamId]) maxPerTeam[p.teamId] = p.score;
            if(p.score > maxPlayerScore) maxPlayerScore = p.score;
            total += p.score;
            
            const viewScore = document.getElementById(`score-val-${p.id}`);
            if(viewScore) viewScore.textContent = p.score;

            const nameEl = document.querySelector(`[data-player-id="${p.id}"] .psr-name`);
            if(nameEl) {
                if(p.score === maxPlayerScore && maxPlayerScore > 0) {
                    nameEl.classList.add('is-mvp');
                } else {
                    nameEl.classList.remove('is-mvp');
                }
            }
        });

        Object.keys(scores).forEach(teamId => {
            if(scores[teamId] > maxTeamScore) maxTeamScore = scores[teamId];
        });

        state.teams.forEach(team => {
            const el = document.getElementById(`score-top-${team.id}`);
            if (el) {
                el.textContent = scores[team.id];
                el.classList.remove('leader');
                if(scores[team.id] === maxTeamScore && maxTeamScore > 0) el.classList.add('leader');
            }
            const cardTotal = document.getElementById(`card-total-${team.id}`);
            if (cardTotal) cardTotal.textContent = scores[team.id];
        });
        
        this.elements.displayTotal.textContent = total;

        state.players.forEach(p => {
            const bar = document.getElementById(`score-bar-${p.id}`);
            if(bar) {
                const pct = maxPerTeam[p.teamId] > 0 ? (p.score / maxPerTeam[p.teamId]) * 100 : 0;
                gsap.to(bar, { width: `${pct}%`, duration: 0.5, ease: "power2.out" });
            }
        });

        state.players.forEach(p => {
            const nameEl = document.querySelector(`[data-player-id="${p.id}"] .psr-name`);
            if(nameEl) {
                if(p.score === maxPlayerScore && maxPlayerScore > 0) nameEl.classList.add('is-mvp');
                else nameEl.classList.remove('is-mvp');
            }
        });
    }

    sortPlayersInCards(state, animate = true) {
        state.teams.forEach(team => {
            const list = document.getElementById(`list-score-${team.id}`);
            if (!list) return;
            
            const rows = Array.from(list.querySelectorAll('.player-score-row'));
            if(rows.length <= 1) return;

            const isVisible = this.expandedTeams.has(team.id);
            let flipState = null;
            if (animate && isVisible) flipState = Flip.getState(rows);

            rows.sort((a, b) => {
                const idA = a.getAttribute('data-player-id');
                const idB = b.getAttribute('data-player-id');
                const scoreA = state.players.find(p => p.id === idA)?.score || 0;
                const scoreB = state.players.find(p => p.id === idB)?.score || 0;
                return scoreB - scoreA;
            });

            rows.forEach((row, index) => {
                list.appendChild(row);
                const rankEl = row.querySelector('.psr-rank');
                if(rankEl) rankEl.textContent = index + 1;
            });

            if (animate && isVisible && flipState) {
                Flip.from(flipState, {
                    duration: 0.5,
                    ease: "power2.inOut",
                    absolute: true
                });
            }
        });
    }

    fullRenderLogs(state) {
        this.elements.logList.innerHTML = '';
        if (state.logs.length === 0) {
            this.renderEmptyState(this.elements.logList, 'A partida ainda não gerou eventos.');
            return;
        }
        const sortedLogs = [...state.logs].sort((a,b) => b.id.localeCompare(a.id));
        sortedLogs.forEach((log, index) => {
            const team = state.teams.find(t => t.id === log.teamId);
            if(!team) return;
            const entry = this.createElement('div', ['log-entry', team.theme]);
            const seq = this.createElement('span', ['log-seq']); seq.textContent = sortedLogs.length - index;
            const name = this.createElement('span', ['log-name']); name.textContent = log.playerName;
            const tag = this.createElement('span', ['tag', 'dyn-bg', 'dyn-color']); tag.textContent = team.name;
            const time = this.createElement('span', ['log-time']); time.textContent = log.time;
            entry.append(seq, name, tag, time);
            this.elements.logList.appendChild(entry);
        });
    }

    switchTab(targetTab) {
        const targetId = targetTab.getAttribute('data-target');
        if (targetTab.classList.contains('active')) return;
        this.elements.tabs.forEach(tab => tab.classList.remove('active'));
        targetTab.classList.add('active');
        const currentView = document.querySelector('.view-container.active');
        const nextView = document.getElementById(targetId);
        gsap.to(currentView, {
            opacity: 0, y: -10, duration: 0.2,
            onComplete: () => {
                currentView.classList.remove('active');
                nextView.classList.add('active');
                gsap.fromTo(nextView, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
            }
        });
    }

    animateScorePulse(teamId) {
        const el = document.getElementById(`score-top-${teamId}`);
        if(el) gsap.timeline().to(el, { scale: 1.2, duration: 0.1, ease: 'power2.out' }).to(el, { scale: 1, duration: 0.3, ease: 'bounce.out' });
        
        const cardTotal = document.getElementById(`card-total-${teamId}`);
        if(cardTotal) gsap.timeline().to(cardTotal, { scale: 1.3, duration: 0.1, ease: 'power2.out' }).to(cardTotal, { scale: 1, duration: 0.3, ease: 'bounce.out' });
    }

    triggerConfetti() {
        this.confetti.burst(window.innerWidth / 2, window.innerHeight * 0.15);
    }

    createElement(tag, classNames = [], attributes = {}) {
        const el = document.createElement(tag);
        if (classNames.length) el.classList.add(...classNames);
        for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
        return el;
    }

    createSVGIcon(type, size = '16') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', size); svg.setAttribute('height', size);
        svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
        
        if (type === 'user') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', '12'); c.setAttribute('cy', '7'); c.setAttribute('r', '4');
            svg.append(p, c);
        } else if (type === 'trash') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); p1.setAttribute('points', '3 6 5 6 21 6');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M19 6l-1 14H6L5 6');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p3.setAttribute('d', 'M10 11v6');
            const p4 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p4.setAttribute('d', 'M14 11v6');
            svg.append(p1, p2, p3, p4);
        } else if (type === 'plus') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p1.setAttribute('x1', '12'); p1.setAttribute('y1', '5'); p1.setAttribute('x2', '12'); p1.setAttribute('y2', '19');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p2.setAttribute('x1', '5'); p2.setAttribute('y1', '12'); p2.setAttribute('x2', '19'); p2.setAttribute('y2', '12');
            svg.append(p1, p2);
        } else if (type === 'minus') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p1.setAttribute('x1', '5'); p1.setAttribute('y1', '12'); p1.setAttribute('x2', '19'); p1.setAttribute('y2', '12');
            svg.appendChild(p1);
        } else if (type === 'shield') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z');
            svg.appendChild(p);
        } else if (type === 'crown') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M2 22h20');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M2 18l5-10 5 6 5-6 5 10H2z');
            svg.append(p1, p2);
        } else if (type === 'sword') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2');
            svg.appendChild(p);
        } else if (type === 'star') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon'); p.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
            svg.appendChild(p);
        } else if (type === 'zap') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon'); p.setAttribute('points', '13 2 3 14 12 14 11 22 21 10 12 10 13 2');
            svg.appendChild(p);
        } else if (type === 'flame') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z');
            svg.appendChild(p);
        } else if (type === 'heart') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z');
            svg.appendChild(p);
        } else if (type === 'skull') {
            const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c1.setAttribute('cx', '9'); c1.setAttribute('cy', '12'); c1.setAttribute('r', '1');
            const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c2.setAttribute('cx', '15'); c2.setAttribute('cy', '12'); c2.setAttribute('r', '1');
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M8 20v2h8v-2');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M12.5 17l-.5-1-.5 1h1z');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p3.setAttribute('d', 'M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20');
            svg.append(c1, c2, p1, p2, p3);
        } else if (type === 'ghost') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M9 10h.01');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M15 10h.01');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p3.setAttribute('d', 'M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z');
            svg.append(p1, p2, p3);
        } else if (type === 'moon') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
            svg.appendChild(p);
        } else if (type === 'sun') {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '5');
            const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l1.setAttribute('x1', '12'); l1.setAttribute('y1', '1'); l1.setAttribute('x2', '12'); l1.setAttribute('y2', '3');
            const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l2.setAttribute('x1', '12'); l2.setAttribute('y1', '21'); l2.setAttribute('x2', '12'); l2.setAttribute('y2', '23');
            const l3 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l3.setAttribute('x1', '4.22'); l3.setAttribute('y1', '4.22'); l3.setAttribute('x2', '5.64'); l3.setAttribute('y2', '5.64');
            const l4 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l4.setAttribute('x1', '18.36'); l4.setAttribute('y1', '18.36'); l4.setAttribute('x2', '19.78'); l4.setAttribute('y2', '19.78');
            const l5 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l5.setAttribute('x1', '1'); l5.setAttribute('y1', '12'); l5.setAttribute('x2', '3'); l5.setAttribute('y2', '12');
            const l6 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l6.setAttribute('x1', '21'); l6.setAttribute('y1', '12'); l6.setAttribute('x2', '23'); l6.setAttribute('y2', '12');
            const l7 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l7.setAttribute('x1', '4.22'); l7.setAttribute('y1', '19.78'); l7.setAttribute('x2', '5.64'); l7.setAttribute('y2', '18.36');
            const l8 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l8.setAttribute('x1', '18.36'); l8.setAttribute('y1', '5.64'); l8.setAttribute('x2', '19.78'); l8.setAttribute('y2', '4.22');
            svg.append(c, l1, l2, l3, l4, l5, l6, l7, l8);
        } else if (type === 'anchor') {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', '12'); c.setAttribute('cy', '5'); c.setAttribute('r', '3');
            const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('x1', '12'); l.setAttribute('y1', '22'); l.setAttribute('x2', '12'); l.setAttribute('y2', '8');
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M5 12H2a10 10 0 0 0 20 0h-3');
            svg.append(c, l, p);
        } else if (type === 'target') {
            const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c1.setAttribute('cx', '12'); c1.setAttribute('cy', '12'); c1.setAttribute('r', '10');
            const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c2.setAttribute('cx', '12'); c2.setAttribute('cy', '12'); c2.setAttribute('r', '6');
            const c3 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c3.setAttribute('cx', '12'); c3.setAttribute('cy', '12'); c3.setAttribute('r', '2');
            svg.append(c1, c2, c3);
        } else if (type === 'award') {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', '12'); c.setAttribute('cy', '8'); c.setAttribute('r', '7');
            const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); pl.setAttribute('points', '8.21 13.89 7 23 12 20 17 23 15.79 13.88');
            svg.append(c, pl);
        } else if (type === 'flag') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z');
            const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('x1', '4'); l.setAttribute('y1', '22'); l.setAttribute('x2', '4'); l.setAttribute('y2', '15');
            svg.append(p, l);
        } else if (type === 'crosshair') {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '10');
            const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l1.setAttribute('x1', '22'); l1.setAttribute('y1', '12'); l1.setAttribute('x2', '18'); l1.setAttribute('y2', '12');
            const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l2.setAttribute('x1', '6'); l2.setAttribute('y1', '12'); l2.setAttribute('x2', '2'); l2.setAttribute('y2', '12');
            const l3 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l3.setAttribute('x1', '12'); l3.setAttribute('y1', '6'); l3.setAttribute('x2', '12'); l3.setAttribute('y2', '2');
            const l4 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l4.setAttribute('x1', '12'); l4.setAttribute('y1', '22'); l4.setAttribute('x2', '12'); l4.setAttribute('y2', '18');
            svg.append(c, l1, l2, l3, l4);
        } else if (type === 'coffee') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M18 8h1a4 4 0 0 1 0 8h-1');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z');
            const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l1.setAttribute('x1', '6'); l1.setAttribute('y1', '1'); l1.setAttribute('x2', '6'); l1.setAttribute('y2', '4');
            const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l2.setAttribute('x1', '10'); l2.setAttribute('y1', '1'); l2.setAttribute('x2', '10'); l2.setAttribute('y2', '4');
            const l3 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l3.setAttribute('x1', '14'); l3.setAttribute('y1', '1'); l3.setAttribute('x2', '14'); l3.setAttribute('y2', '4');
            svg.append(p1, p2, l1, l2, l3);
        } else if (type === 'music') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M9 18V5l12-2v13');
            const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c1.setAttribute('cx', '6'); c1.setAttribute('cy', '18'); c1.setAttribute('r', '3');
            const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c2.setAttribute('cx', '18'); c2.setAttribute('cy', '16'); c2.setAttribute('r', '3');
            svg.append(p, c1, c2);
        } else if (type === 'chevron') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); p.setAttribute('points', '6 9 12 15 18 9');
            svg.appendChild(p);
        } else if (type === 'rainbow') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M4 18a8 8 0 0 1 16 0');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M7 18a5 5 0 0 1 10 0');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p3.setAttribute('d', 'M10 18a2 2 0 0 1 4 0');
            svg.append(p1, p2, p3);
        } else if (type === 'trans') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); p1.setAttribute('cx', '12'); p1.setAttribute('cy', '12'); p1.setAttribute('r', '4');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p2.setAttribute('x1', '12'); p2.setAttribute('y1', '8'); p2.setAttribute('x2', '12'); p2.setAttribute('y2', '2');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p3.setAttribute('x1', '9'); p3.setAttribute('y1', '4'); p3.setAttribute('x2', '15'); p3.setAttribute('y2', '4');
            const p4 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p4.setAttribute('x1', '14.8'); p4.setAttribute('y1', '9.2'); p4.setAttribute('x2', '19.5'); p4.setAttribute('y2', '4.5');
            const p5 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); p5.setAttribute('points', '15 4 19.5 4 19.5 8.5');
            const p6 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p6.setAttribute('x1', '16.5'); p6.setAttribute('y1', '5.5'); p6.setAttribute('x2', '18.5'); p6.setAttribute('y2', '7.5');
            const p7 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p7.setAttribute('x1', '9.2'); p7.setAttribute('y1', '9.2'); p7.setAttribute('x2', '4.5'); p7.setAttribute('y2', '4.5');
            const p8 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); p8.setAttribute('points', '4.5 7.5 4.5 4.5 7.5 4.5');
            svg.append(p1, p2, p3, p4, p5, p6, p7, p8);
        } else if (type === 'mars-mars') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); p1.setAttribute('cx', '9'); p1.setAttribute('cy', '14'); p1.setAttribute('r', '4');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p2.setAttribute('x1', '11.8'); p2.setAttribute('y1', '11.2'); p2.setAttribute('x2', '16.5'); p2.setAttribute('y2', '6.5');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); p3.setAttribute('points', '12.5 6.5 16.5 6.5 16.5 10.5');
            const p4 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); p4.setAttribute('cx', '15'); p4.setAttribute('cy', '10'); p4.setAttribute('r', '4');
            const p5 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p5.setAttribute('x1', '17.8'); p5.setAttribute('y1', '7.2'); p5.setAttribute('x2', '21.5'); p5.setAttribute('y2', '3.5');
            const p6 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); p6.setAttribute('points', '17.5 3.5 21.5 3.5 21.5 7.5');
            svg.append(p1, p2, p3, p4, p5, p6);
        } else if (type === 'venus-venus') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); p1.setAttribute('cx', '9'); p1.setAttribute('cy', '8'); p1.setAttribute('r', '4');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p2.setAttribute('x1', '9'); p2.setAttribute('y1', '12'); p2.setAttribute('x2', '9'); p2.setAttribute('y2', '19');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p3.setAttribute('x1', '6.5'); p3.setAttribute('y1', '15.5'); p3.setAttribute('x2', '11.5'); p3.setAttribute('y2', '15.5');
            const p4 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); p4.setAttribute('cx', '15'); p4.setAttribute('cy', '8'); p4.setAttribute('r', '4');
            const p5 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p5.setAttribute('x1', '15'); p5.setAttribute('y1', '12'); p5.setAttribute('x2', '15'); p5.setAttribute('y2', '19');
            const p6 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); p6.setAttribute('x1', '12.5'); p6.setAttribute('y1', '15.5'); p6.setAttribute('x2', '17.5'); p6.setAttribute('y2', '15.5');
            svg.append(p1, p2, p3, p4, p5, p6);
        } else if (type === 'infinity-heart') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M7 12a2.5 2.5 0 0 1 5 0c0 2.5-5 2.5-5 5a2.5 2.5 0 0 1 5 0c0-2.5-5-2.5-5-5z');
            p2.setAttribute('transform', 'matrix(1 0 0 1 2.5 -0.5)');
            svg.append(p1, p2);
        } else if (type === 'martini') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M8 22h8');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M12 11v11');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p3.setAttribute('d', 'm19 3-7 8-7-8Z');
            svg.append(p1, p2, p3);
        } else if (type === 'gamepad') {
            const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('x', '2'); r.setAttribute('y', '6'); r.setAttribute('width', '20'); r.setAttribute('height', '12'); r.setAttribute('rx', '2');
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M6 12h4');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M8 10v4');
            const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l1.setAttribute('x1', '15'); l1.setAttribute('y1', '13'); l1.setAttribute('x2', '15.01'); l1.setAttribute('y2', '13');
            const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l2.setAttribute('x1', '18'); l2.setAttribute('y1', '11'); l2.setAttribute('x2', '18.01'); l2.setAttribute('y2', '11');
            svg.append(r, p1, p2, l1, l2);
        } else if (type === 'diamond') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M6 3h12l4 6-10 13L2 9Z');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M11 3 8 9l4 13');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p3.setAttribute('d', 'M12.5 3l3 6-4 13');
            svg.append(p1, p2, p3);
        } else if (type === 'bomb') {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', '12'); c.setAttribute('cy', '13'); c.setAttribute('r', '8');
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M12 5v-2');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M14 2h-4');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p3.setAttribute('d', 'M16 4l-2 2');
            svg.append(c, p1, p2, p3);
        } else if (type === 'droplet') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z');
            svg.appendChild(p);
        } else if (type === 'eye') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z');
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '3');
            svg.append(p, c);
        } else if (type === 'key') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4');
            svg.appendChild(p);
        } else if (type === 'alien') {
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M12 2c-4.4 0-8 4.2-8 9 0 3 2 7 8 11 6-4 8-8 8-11 0-4.8-3.6-9-8-9z');
            const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c1.setAttribute('cx', '8'); c1.setAttribute('cy', '13'); c1.setAttribute('r', '2');
            const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c2.setAttribute('cx', '16'); c2.setAttribute('cy', '13'); c2.setAttribute('r', '2');
            svg.append(p, c1, c2);
        } else if (type === 'paw') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M11 11.083c.85-.355 1.7-.583 2.5-.583.85 0 1.7.228 2.5.583a4 4 0 1 1-5 0Z');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'M6 13a4 4 0 1 1-4-4 4 4 0 0 1 4 4Z');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p3.setAttribute('d', 'M14 6a4 4 0 1 1-4-4 4 4 0 0 1 4 4Z');
            const p4 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p4.setAttribute('d', 'M22 13a4 4 0 1 1-4-4 4 4 0 0 1 4 4Z');
            svg.append(p1, p2, p3, p4);
        } else if (type === 'rocket') {
            const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p1.setAttribute('d', 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z');
            const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p2.setAttribute('d', 'm12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z');
            const p3 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p3.setAttribute('d', 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0');
            const p4 = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p4.setAttribute('d', 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5');
            svg.append(p1, p2, p3, p4);
        }
        return svg;
    }

    renderEmptyState(container, message) {
        if (container.querySelector('.empty-state')) return;
        const empty = this.createElement('div', ['empty-state']); 
        empty.appendChild(this.createSVGIcon('ghost', '32'));
        const emptyTxt = this.createElement('span'); emptyTxt.textContent = message;
        empty.appendChild(emptyTxt);
        container.appendChild(empty);
    }

    showToast(message, type = 'success') {
        const toast = this.createElement('div', ['toast', type]);
        const iconDiv = this.createElement('div', ['toast-icon']);
        const svg = this.createSVGIcon(type === 'success' ? 'plus' : 'minus', '20');
        iconDiv.appendChild(svg);
        const textDiv = this.createElement('div'); textDiv.textContent = message;
        toast.append(iconDiv, textDiv);
        this.elements.toastRoot.appendChild(toast);
        gsap.fromTo(toast, { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.3, ease: 'back.out(1.5)' });
        setTimeout(() => gsap.to(toast, { opacity: 0, x: 50, duration: 0.3, ease: 'power2.in', onComplete: () => toast.remove() }), 3000);
    }

    showModal(title, message, onConfirm) {
        this.elements.modalRoot.innerHTML = '';
        const content = this.createElement('div', ['modal-content']);
        const header = this.createElement('div', ['modal-header']);
        const svg = this.createSVGIcon('minus', '24');
        svg.style.stroke = 'var(--color-danger)';
        const titleEl = this.createElement('h3', ['modal-title']); titleEl.textContent = title;
        header.append(svg, titleEl);
        const bodyEl = this.createElement('p', ['modal-body']); bodyEl.textContent = message;
        const actions = this.createElement('div', ['modal-actions']);
        const btnCancel = this.createElement('button', ['btn', 'btn-outline']); btnCancel.textContent = 'Cancelar';
        const btnConfirm = this.createElement('button', ['btn', 'btn-danger']); btnConfirm.textContent = 'Confirmar Ação';
        
        const closeModal = () => {
            gsap.to(content, { y: 20, opacity: 0, duration: 0.2 });
            gsap.to(this.elements.modalRoot, { opacity: 0, duration: 0.2, onComplete: () => this.elements.modalRoot.classList.remove('active') });
        };
        btnCancel.addEventListener('click', closeModal);
        btnConfirm.addEventListener('click', () => { onConfirm(); closeModal(); });
        actions.append(btnCancel, btnConfirm);
        content.append(header, bodyEl, actions);
        this.elements.modalRoot.appendChild(content);
        this.elements.modalRoot.classList.add('active');
        gsap.to(this.elements.modalRoot, { opacity: 1, duration: 0.2 });
        gsap.fromTo(content, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.2)' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const introOverlay = document.getElementById('intro-overlay');
    const introText = document.querySelector('.intro-text');
    const broadcastLine = document.querySelector('.broadcast-line');

    gsap.set(introText, { visibility: 'visible', x: '-100vw', opacity: 0 });
    gsap.set(broadcastLine, { scaleX: 0, transformOrigin: 'left' });

    const tlIntro = gsap.timeline({
        onComplete: () => {
            introOverlay.style.display = 'none';
        }
    });

    tlIntro.to(broadcastLine, {
        scaleX: 1,
        duration: 0.8,
        ease: "expo.inOut"
    })
    .to(introText, {
        x: '0vw',
        opacity: 1,
        duration: 1.2,
        ease: "expo.out"
    }, "-=0.3")
    .to(introText, {
        x: '3vw',
        duration: 2,
        ease: "sine.inOut"
    }, "-=0.8")
    .to(introText, {
        x: '100vw',
        opacity: 0,
        duration: 0.8,
        ease: "expo.in"
    })
    .to(broadcastLine, {
        scaleX: 0,
        transformOrigin: 'right',
        duration: 0.6,
        ease: "expo.inOut"
    }, "-=0.6")
    .to(introOverlay, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut"
    }, "-=0.2");

    const appState = new AppState();
    const confettiEngine = new ConfettiEngine('canvas-confetti');
    const uiManager = new UIManager(appState, confettiEngine);
});