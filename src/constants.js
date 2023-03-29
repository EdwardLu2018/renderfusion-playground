export const Experiments = Object.freeze({
    LowPolyLocal:       'low poly local',
    HighPolyLocal:      'high poly local',
    HighPolyRemote:     'high poly remote (no atw)',
    HighPolyRemoteATW:  'high poly remote (with atw)',
    Mixed:              'mixed (no atw)',
    MixedATW:           'mixed (with atw)',
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
    INTERSECT:  'raycaster-custom-intersected',
});
