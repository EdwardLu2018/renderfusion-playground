export const Experiments = Object.freeze({
    LowPolyLocal:       'Low Poly Local',
    HighPolyLocal:      'High Poly Local',
    HighPolyRemote:     'High Poly Remote (no atw)',
    HighPolyRemoteATW:  'High Poly Remote (with atw)',
    Mixed:              'Mixed (no atw)',
    MixedATW:           'Mixed (with atw)',
});

export const ExperimentsList = Object.values(Experiments);

export const RenderingMedium = Object.freeze({
    Local:  'local',
    Remote: 'remote',
});

export const Resolution = Object.freeze({
    Low:    'low',
    High:   'high',
});

export const EVENTS = Object.freeze({
    RAYCASTER_INTERSECT:    'raycaster-custom-intersected',
});
