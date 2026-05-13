// ============================================
// SISTEMA DE AUTENTICACION SEGURA
// Panel RPA Servicios
// ============================================

const AUTH = {
    // Contrasenas hasheadas con SHA-256
    users: {
        'rappi': '71b5a564ce86f337ed95ea4f8e8d1054ec4f0cf621f9c1a3ca6608b18fc97912',
        'didi': '8d2e8ddf0343bfa34b08487fa14b0ad019eb5fdf0f785e4b8b92d89e6cb197ce',
        'uber': '119cec713a7361a3eba20e6ba49e25fd71acff701cbfac61e1cb4fe1e27c307c',
        'cloud': '5519c0763e87609add4e3635ae5c088332b9a12d9f627e00ca1b56d6b6e839ac'
    },
    robots: {
        'rappi': ['rappi'],
        'didi': ['didi'],
        'uber': ['uber'],
        'cloud': ['cloud']
    }
};

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
