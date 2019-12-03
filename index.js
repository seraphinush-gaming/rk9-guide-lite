'use strict';

const ZONE_RKHM = 9935;

class rk9hm_guide_lite {

  constructor(mod) {

    this.m = mod;
    this.c = mod.command;
    this.g = mod.game;
    this.s = mod.settings;
    this.hooks = [];

    this.enable = this.s.enable;

    this.chat_ch = 0;
    this.loaded = false;
    this.mech_str = this.m.region === 'kr' ? ['근', '원', '터', 'ㅇ'] : ['out', 'in', 'wave', 'o'];
    this.msg_a = this.msg_b = this.mech_str[3];
    this.cur_zone = 0;
    this.prev_mech_first = true;
    this.third_boss = false;

    // command
    this.c.add('rk', {
      '$none': () => {
        this.enable = !this.enable;
        this.enable && this.cur_zone === ZONE_RKHM ? this.load() : this.unload();
        this.send(`${this.enable ? 'En' : 'Dis'}abled`);
      },
      'party': () => { // 1
        this.chat_ch !== 1 ? this.chat_ch = 1 : this.chat_ch = 0;
        this.send(`Sending mechanics order to party chat ${this.chat_ch !== 0 ? 'en' : 'dis'}abled.`);
      },
      'notice': () => { // 21
        this.chat_ch !== 21 ? this.chat_ch = 21 : this.chat_ch = 0;
        this.send(`Sending mechanics order to notice chat ${this.chat_ch !== 0 ? 'en' : 'dis'}abled.`);
        if (this.chat_ch === 21)
          this.send(`Please make sure you are the party leader.`);
      },
      '$default': () => this.send(`Invalid argument. usage : rk [party|notice]`)
    });

    // game state
    this.g.me.on('change_zone', (zone) => {
      this.cur_zone = zone;
      if (this.enable && !this.loaded && zone === ZONE_RKHM) {
        this.load();
        this.loaded = true;
      }
      else if (this.enable && this.loaded && zone !== ZONE_RKHM) {
        this.unload();
        this.loaded = false;
        this.msg_a = this.mech_str[3];
        this.msg_b = this.mech_str[3];
        this.prev_mech_first = true;
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
    if (this.chat_ch !== 0) {
      this.m.send('C_CHAT', 1, {
        channel: this.chat_ch,
        message: msg
      });
    }
    else {
      this.send(msg);
    }
  }

  mech_order(delay) {
    this.m.setTimeout(() => {
      this.prev_mech_first ? this.to_chat(`${this.msg_a} ${this.msg_b}`) : this.to_chat(`${this.msg_b} ${this.msg_a}`);
    }, delay);
  }

  // code
  hook() {
    this.hooks.push(this.m.hook(...arguments));
  }

  load() {
    this.hook('S_BOSS_GAGE_INFO', 3, (e) => {
      this.third_boss = e.templateId === 3000;
    });

    this.hook('S_DUNGEON_EVENT_MESSAGE', 2, (e) => {
      if (this.third_boss) {
        let id = parseInt(e.message.replace('@dungeon:', ''));
        switch (id) {
          case 9935302:
            this.msg_a = this.mech_str[0];
            this.mech_order(2000);
            break;
          case 9935303:
            this.msg_a = this.mech_str[1];
            this.mech_order(2000);
            break;
          case 9935304:
            this.msg_a = this.mech_str[2];
            this.mech_order(2000);
            break;
          case 9935311:
            this.prev_mech_first = true;
            this.mech_order(2000);
            break;
          case 9935312:
            this.prev_mech_first = false;
            this.mech_order(2000);
            break;
        }
      }
    });

    this.hook('S_QUEST_BALLOON', 1, (e) => {
      if (this.third_boss) { // relevant IDs range from 935301 to 935303
        let index = parseInt(e.message.replace('@monsterBehavior:', '')) - 935301;
        if (0 <= index && index < 3) {
          this.msg_b = this.mech_str[index];
          this.m.setTimeout(() => {
            this.msg_a = this.msg_b;
            this.msg_b = this.mech_str[3];
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
    return this.cur_zone;
  }

  loadState(state) {
    if (this.enable && !this.loaded && state === ZONE_RKHM) {
      this.cur_zone = state;
      this.load();
    }
  }

}

module.exports = rk9hm_guide_lite;