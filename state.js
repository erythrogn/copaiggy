import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-analytics.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAGdn9lHp48Ii6HNSoohLPXjkzD5qmrdQI",
    authDomain: "copaiggy.firebaseapp.com",
    projectId: "copaiggy",
    storageBucket: "copaiggy.firebasestorage.app",
    messagingSenderId: "830780345547",
    appId: "1:830780345547:web:898750fc2f178181db1f4e",
    measurementId: "G-Z4897BGBSX"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const docRef = doc(db, "partidas", "estado_global");

export class AppState {
    constructor() {
        this.state = { 
            teams: [
                { id: 't_verde', name: 'Time Verde', theme: 'theme-verde', icon: 'shield' },
                { id: 't_amarelo', name: 'Time Amarelo', theme: 'theme-amarelo', icon: 'crown' }
            ],
            players: [], 
            logs: [] 
        };
        this.listeners = [];
        this.initSync();
    }
    
    initSync() {
        onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (!data.teams) {
                    data.teams = [
                        { id: 't_verde', name: data.teamA || 'Time Verde', theme: 'theme-verde', icon: 'shield' },
                        { id: 't_amarelo', name: data.teamB || 'Time Amarelo', theme: 'theme-amarelo', icon: 'crown' }
                    ];
                    data.players = (data.players || []).map(p => ({
                        ...p,
                        teamId: p.team === 'a' ? 't_verde' : 't_amarelo'
                    }));
                    delete data.teamA;
                    delete data.teamB;
                    this.state = data;
                    this.pushToRemote();
                } else {
                    this.state = data;
                }
                this.notify('REMOTE_SYNC', null);
            } else {
                this.pushToRemote();
            }
        });
    }

    async pushToRemote() {
        try { await setDoc(docRef, this.state); } 
        catch (error) { console.error("Erro ao sincronizar", error); }
    }

    subscribe(listener) { this.listeners.push(listener); }
    notify(event, data) { this.listeners.forEach(listener => listener(event, data, this.state)); }

    addTeam(name, theme, icon) {
        const id = 'team_' + Date.now().toString(36);
        this.state.teams.push({ id, name, theme, icon });
        this.notify('STRUCTURE_CHANGED', null);
        this.pushToRemote();
    }

    removeTeam(id) {
        this.state.teams = this.state.teams.filter(t => t.id !== id);
        this.state.players = this.state.players.filter(p => p.teamId !== id);
        this.notify('STRUCTURE_CHANGED', null);
        this.pushToRemote();
    }

    addPlayer(name, teamId) {
        const id = 'player_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        const newPlayer = { id, name, teamId, score: 0 };
        this.state.players.push(newPlayer);
        this.notify('STRUCTURE_CHANGED', null);
        this.pushToRemote();
    }

    removePlayer(id) {
        this.state.players = this.state.players.filter(p => p.id !== id);
        this.notify('STRUCTURE_CHANGED', null);
        this.pushToRemote();
    }

    incrementScore(id) {
        const player = this.state.players.find(p => p.id === id);
        if (player) {
            player.score += 1;
            const logEntry = {
                id: 'log_' + Date.now().toString(36),
                playerName: player.name,
                teamId: player.teamId,
                time: new Date().toLocaleTimeString('pt-BR')
            };
            this.state.logs.unshift(logEntry);
            this.notify('SCORE_CHANGED', { player, logEntry });
            this.pushToRemote();
        }
    }

    decrementScore(id) {
        const player = this.state.players.find(p => p.id === id);
        if (player && player.score > 0) {
            player.score -= 1;
            const logIndex = this.state.logs.findIndex(l => l.playerName === player.name);
            if (logIndex !== -1) this.state.logs.splice(logIndex, 1);
            this.notify('SCORE_CHANGED', { player });
            this.pushToRemote();
        }
    }

    resetAll() {
        this.state.players.forEach(p => p.score = 0);
        this.state.logs = [];
        this.notify('STRUCTURE_CHANGED', null);
        this.pushToRemote();
    }
}