/**
 * Evoo Vault — lokalny menadżer haseł
 * Szyfrowanie: AES-GCM 256 + PBKDF2 (150k iteracji)
 * Dane trzymane wyłącznie w localStorage (zaszyfrowane)
 */
const Vault = (() => {
  const STORAGE_KEY = 'evoo_vault_v1';
  const SALT = new TextEncoder().encode('evoo-vault-salt-v1');
  let encKey = null;
  let unlocked = false;

  async function deriveKey(masterPassword) {
    const base = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterPassword),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: SALT,
        iterations: 150000,
        hash: 'SHA-256'
      },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encrypt(plain) {
    if (!encKey) throw new Error('Vault zablokowany');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      encKey,
      new TextEncoder().encode(plain)
    );
    return {
      iv: btoa(String.fromCharCode(...iv)),
      data: btoa(String.fromCharCode(...new Uint8Array(data)))
    };
  }

  async function decrypt(obj) {
    if (!encKey) throw new Error('Vault zablokowany');
    const iv = Uint8Array.from(atob(obj.iv), c => c.charCodeAt(0));
    const data = Uint8Array.from(atob(obj.data), c => c.charCodeAt(0));
    const out = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      encKey,
      data
    );
    return new TextDecoder().decode(out);
  }

  function loadRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveRaw(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  return {
    isUnlocked() {
      return unlocked;
    },

    async unlock(masterPassword) {
      encKey = await deriveKey(masterPassword);
      // Test: spróbuj odszyfrować istniejące dane lub zapisz marker
      const raw = loadRaw();
      if (raw.length > 0) {
        try {
          await decrypt(raw[0].payload);
        } catch {
          encKey = null;
          throw new Error('Nieprawidłowe hasło główne');
        }
      }
      unlocked = true;
      return true;
    },

    lock() {
      encKey = null;
      unlocked = false;
    },

    async save(entry) {
      if (!unlocked) throw new Error('Vault zablokowany');
      const payload = await encrypt(JSON.stringify({
        name: entry.name,
        user: entry.user,
        pass: entry.pass,
        notes: entry.notes || '',
        created: Date.now()
      }));
      const raw = loadRaw();
      const id = crypto.randomUUID();
      raw.push({ id, payload });
      saveRaw(raw);
      return id;
    },

    async list() {
      if (!unlocked) return [];
      const raw = loadRaw();
      const result = [];
      for (const item of raw) {
        try {
          const data = JSON.parse(await decrypt(item.payload));
          result.push({ id: item.id, ...data });
        } catch {
          // pomiń uszkodzone
        }
      }
      // sortuj od najnowszych
      result.sort((a, b) => (b.created || 0) - (a.created || 0));
      return result;
    },

    async remove(id) {
      if (!unlocked) throw new Error('Vault zablokowany');
      const raw = loadRaw().filter(x => x.id !== id);
      saveRaw(raw);
    },

    async getPassword(id) {
      const items = await this.list();
      const found = items.find(x => x.id === id);
      return found ? found.pass : null;
    }
  };
})();
