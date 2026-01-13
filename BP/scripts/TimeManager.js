import { system } from "@minecraft/server";

export class TimeManager {

    constructor() {
        this.activeTimers = new Set()
    }

    runTimeout(callback, ticks) {
        const id = system.runTimeout(() => {
            this.activeTimers.delete(id);
            callback();
        }, ticks);
        this.activeTimers.add(id);
        return id;
    }

    runInterval(callback, ticks) {
        const id = system.runInterval(callback, ticks);
        this.activeTimers.add(id);
        return id;
    }

    clear(id) {
        system.clearRun(id);
        this.activeTimers.delete(id)
    } 

    clearAll() {
        this.activeTimers.forEach(id => {
            system.clearRun(id)
        });
        this.activeTimers.clear();
    }
}