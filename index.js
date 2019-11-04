'use strict';

class rk9hm_guide_lite {

  constructor(mod) {

    this.m = mod;
    this.c = mod.command;
    this.g = mod.game;
    this.s = mod.settings;
    this.hooks = [];

    this.enable = this.s.enable;

    this.chatChannel = 0;
    this.curZone = 0;
    this.loaded = false;
    this.mechStrings = this.m.region === 'kr' ? ['근', '원', '터', 'ㅇ'] : ['out', 'in', 'wave', 'o'];
    this.messageA = this.mechStrings[3];
    this.messageB = this.mechStrings[3];
    this.myZone = 0;
    this.prevMechFirst = true;
    this.thirdBoss = false;

    // command
    this.c.add('rk', {
      '$none': () => {
        this.enable = !this.enable;
        this.enable && this.myZone === 9935 ? this.load() : this.unload();
        this.send(`${this.enable ? 'En' : 'Dis'}abled`);
      },
      'party': () => { // 1
        this.chatChannel !== 1 ? this.chatChannel = 1 : this.chatChannel = 0;
        this.send(`Sending mechanics order to party chat ${this.chatChannel === 0 ? 'en' : 'dis'}abled.`);
      },
      'notice': () => { // 21
        this.chatChannel !== 21 ? this.chatChannel = 21 : this.chatChannel = 0;
        this.send(`Sending mechanics order to notice chat ${this.chatChannel === 0 ? 'en' : 'dis'}abled.`);
        if (this.chatChannel === 21)
          this.send(`Please make sure you are the party leader.`);
      },
      '$default': () => this.send(`Invalid argument. usage : rk [party|notice]`)
    });

    // game state
    this.g.me.on('change_zone', (zone) => {
      this.myZone = zone;
      if (this.enable && !this.loaded && zone === 9935) {
        this.load();
        this.loaded = true;
      }
      else if (this.enable && this.loaded && zone !== 9935) {
        this.unload();
        this.loaded = false;
        this.messageA = this.mechStrings[3];
        this.messageB = this.mechStrings[3];
        this.prevMechFirst = true;
        this.send(`Leaving RK-9 Kennel (hard). unloaded guide module.`);
      }
    });

  }

  destructor() {
    this.unload();
    this.c.remove('rk');
  }

  // helper
  to_chat(msg) {
    if (this.chatChannel) {
      this.m.send('C_CHAT', 1, {
        channel: this.chatChannel,
        message: msg
      });
    }
    else {
      this.send(msg);
    }
  }

  mech_order(delay) {
    this.m.setTimeout(() => {
      if (this.prevMechFirst)
        this.to_chat(`${this.messageA} ${this.messageB}`);
      else
        this.to_chat(`${this.messageB} ${this.messageA}`);
    }, delay);
  }

  // code
  hook() {
    this.hooks.push(this.m.hook(...arguments));
  }

  load() {
    this.hook('S_BOSS_GAGE_INFO', 3, (e) => {
      this.thirdBoss = e.templateId === 3000;
    });

    this.hook('S_DUNGEON_EVENT_MESSAGE', 2, (e) => {
      if (this.thirdBoss) {
        let id = parseInt(e.message.replace('@dungeon:', ''));
        switch (id) {
          case 9935302:
            this.messageA = this.mechStrings[0];
            this.mech_order(2000);
            break;
          case 9935303:
            this.messageA = this.mechStrings[1];
            this.mech_order(2000);
            break;
          case 9935304:
            this.messageA = this.mechStrings[2];
            this.mech_order(2000);
            break;
          case 9935311:
            this.prevMechFirst = true;
            this.mech_order(2000);
            break;
          case 9935312:
            this.prevMechFirst = false;
            this.mech_order(2000);
            break;
        }
      }
    });

    this.hook('S_QUEST_BALLOON', 1, (e) => {
      if (this.thirdBoss) { // relevant IDs range from 935301 to 935303
        let index = parseInt(e.message.replace('@monsterBehavior:', '')) - 935301;
        if (0 <= index && index < 3) {
          this.messageB = this.mechStrings[index];
          this.m.setTimeout(() => {
            this.messageA = this.messageB;
            this.messageB = this.mechStrings[3];
            this.mech_order(6000);
          }, 8000);
        }
      }
    });

    this.loaded = true;
    this.send(`Entering RK-9 Kennel (hard). loaded guide module.`);
  }

  unload() {
    if (this.hooks.length) {
      for (let h of this.hooks) {
        this.m.unhook(h);
      }
      this.hooks = [];
    }
    
    this.loaded = false;
  }

  send() { this.c.message(': ' + [...arguments].join('\n\t - ')); }

  // reload
  saveState() {
    return this.myZone;
  }

  loadState(state) {
    if (this.enable && !this.loaded && state === 9935) {
      this.load();
      this.loaded = true;
      this.curZone = state;
    }
  }

}

module.exports = rk9hm_guide_lite;