// ==========================================
// SMOOTHVSTUDIO
// VOCAL SATURATION
// V1.1
// ==========================================
//
// Executor DSP dedicado à reconstrução
// harmônica vocal moderada.
//
// V1.1:
//
// - preserva caminho DRY integral;
// - adiciona saturação em paralelo;
// - utiliza cinco regiões espectrais;
// - mantém reconstrução harmônica sutil;
// - evita substituir o vocal original;
// - mantém dinâmica original como base;
// - não consulta inteligência;
// - não altera decisões do projeto.
//
// REGIÕES:
//
// 1. GRAVES
// 2. MÉDIO-GRAVES
// 3. MÉDIOS
// 4. MÉDIO-AGUDOS
// 5. AGUDOS
//
// IMPORTANTE:
//
// Este módulo é exclusivamente DSP.
//
// Ele NÃO:
//
// - cria decisões;
// - consulta TreatmentPlan;
// - consulta DecisionPipeline;
// - altera Body;
// - altera Tone;
// - altera Dynamics;
// - altera Harshness;
// - altera Sibilance;
// - altera a inteligência.
//
// Ele recebe somente:
//
// - OfflineAudioContext;
// - análise já existente.
//
// ==========================================


class VocalSaturation {


    constructor(
        options = {}
    ) {


        this.version =
            "1.1";


        // ==================================
        // LIMITES GERAIS
        // ==================================

        this.maxDrive =
            Number.isFinite(
                options.maxDrive
            )
                ? options.maxDrive
                : 0.16;


        this.maxMix =
            Number.isFinite(
                options.maxMix
            )
                ? options.maxMix
                : 0.18;


        this.outputTrim =
            Number.isFinite(
                options.outputTrim
            )
                ? options.outputTrim
                : 0.985;


        // ==================================
        // DRY / WET
        // ==================================
        //
        // O vocal original permanece como
        // fundamento do processamento.
        //
        // A saturação somente acrescenta
        // conteúdo harmônico.
        //
        // ==================================

        this.dryGain =
            Number.isFinite(
                options.dryGain
            )
                ? options.dryGain
                : 1.0;


        this.wetGain =
            Number.isFinite(
                options.wetGain
            )
                ? options.wetGain
                : 1.0;


        // ==================================
        // REGIÕES
        // ==================================

        this.regions = {

            low: {

                name:
                    "low",

                minFrequency:
                    35,

                maxFrequency:
                    110,

                drive:
                    0.055,

                mix:
                    0.080
            },


            lowMid: {

                name:
                    "lowMid",

                minFrequency:
                    110,

                maxFrequency:
                    320,

                drive:
                    0.065,

                mix:
                    0.090
            },


            mid: {

                name:
                    "mid",

                minFrequency:
                    320,

                maxFrequency:
                    1200,

                drive:
                    0.075,

                mix:
                    0.100
            },


            highMid: {

                name:
                    "highMid",

                minFrequency:
                    1200,

                maxFrequency:
                    4200,

                drive:
                    0.060,

                mix:
                    0.085
            },


            high: {

                name:
                    "high",

                minFrequency:
                    4200,

                maxFrequency:
                    12000,

                drive:
                    0.035,

                mix:
                    0.050
            }
        };


        // ==================================
        // ÚLTIMA CONFIGURAÇÃO
        // ==================================

        this.lastSettings =
            null;
    }


    // ======================================
    // CLAMP
    // ======================================

    clamp(
        value,
        min,
        max
    ) {

        return Math.min(
            max,
            Math.max(
                min,
                value
            )
        );
    }


    // ======================================
    // NÚMERO SEGURO
    // ======================================

    safeNumber(
        value,
        fallback = 0
    ) {

        return Number.isFinite(
            value
        )
            ? value
            : fallback;
    }


    // ======================================
    // DETECTAR SAMPLE RATE
    // ======================================

    resolveSampleRate(
        context
    ) {

        return this.safeNumber(
            context &&
            context.sampleRate,
            48000
        );
    }


    // ======================================
    // LIMITAR FREQUÊNCIA
    // ======================================

    clampFrequency(
        frequency,
        sampleRate
    ) {

        const nyquist =
            sampleRate *
            0.5;


        return this.clamp(
            frequency,
            20,
            nyquist *
            0.92
        );
    }
            // ======================================
        // LER POSSÍVEL RMS DA ANÁLISE
        // ======================================

    resolveAnalysisLevel(
        analysis
    ) {

        if (
            !analysis ||
            typeof analysis !==
            "object"
        ) {

            return 0.35;
        }


        // ==================================
        // RMS REAL DO VOCAL ANALYZER
        // ==================================
        //
        // O Analyzer já fornece rmsDb.
        //
        // Utilizamos essa métrica como
        // primeira fonte de nível.
        //
        // Conversão:
        //
        // dBFS → amplitude linear
        //
        // Isso evita criar uma nova
        // infraestrutura de análise.
        //
        // ==================================

        const rmsDb =
            Number(
                analysis.rmsDb
            );


        if (
            Number.isFinite(
                rmsDb
            ) &&
            rmsDb <= 0
        ) {

            const linearRms =
                Math.pow(
                    10,
                    rmsDb /
                    20
                );


            return this.clamp(
                linearRms,
                0,
                1
            );
        }


        // ==================================
        // FALLBACKS COMPATÍVEIS
        // ==================================
        //
        // Mantidos para preservar
        // compatibilidade com possíveis
        // consumidores que forneçam
        // outra representação de nível.
        //
        // ==================================

        const candidates = [

            analysis.rms,

            analysis.RMS,

            analysis.level,

            analysis.energy,

            analysis.signalLevel,

            analysis.averageLevel
        ];


        for (
            const candidate
            of candidates
        ) {

            if (
                Number.isFinite(
                    candidate
                )
            ) {

                if (
                    candidate >= 0 &&
                    candidate <= 1
                ) {

                    return candidate;
                }


                if (
                    candidate < 0
                ) {

                    const linear =
                        Math.pow(
                            10,
                            candidate /
                            20
                        );


                    return this.clamp(
                        linear,
                        0,
                        1
                    );
                }
            }
        }


        return 0.35;
    }


    // ======================================
    // ADAPTAÇÃO GLOBAL
    // ======================================

    calculateAdaptation(
        analysis
    ) {

        const level =
            this.resolveAnalysisLevel(
                analysis
            );


        const normalized =
            this.clamp(
                level,
                0.05,
                0.85
            );


        /*
         * A adaptação permanece limitada.
         *
         * O objetivo não é aumentar
         * agressivamente a saturação em
         * vocais de baixo nível.
         */

        const adaptation =
            1 -
            (
                normalized *
                0.32
            );


        return this.clamp(
            adaptation,
            0.70,
            0.98
        );
    }


    // ======================================
    // CURVA DE SATURAÇÃO SUAVE
    // ======================================

    createSaturationCurve(
        drive = 0.08
    ) {

        const samples =
            2048;


        const curve =
            new Float32Array(
                samples
            );


        const safeDrive =
            this.clamp(
                drive,
                0,
                this.maxDrive
            );


        /*
         * Curva arctan suave.
         *
         * Evita hard clipping e mantém
         * a geração harmônica progressiva.
         */

        const amount =
            1 +
            (
                safeDrive *
                8
            );


        const normalization =
            Math.atan(
                amount
            );


        for (
            let i = 0;
            i < samples;
            i++
        ) {

            const x =
                (
                    i /
                    (
                        samples -
                        1
                    )
                ) *
                2 -
                1;


            const shaped =
                Math.atan(
                    x *
                    amount
                ) /
                normalization;


            curve[i] =
                shaped;
        }


        return curve;
    }


    // ======================================
    // CRIAR WAVESHAPER
    // ======================================

    createShaper(
        context,
        drive
    ) {

        const shaper =
            context.createWaveShaper();


        shaper.curve =
            this.createSaturationCurve(
                drive
            );


        shaper.oversample =
            "2x";


        return shaper;
    }
        // ======================================
    // CRIAR FILTRO REGIONAL
    // ======================================

    createBandpass(
        context,
        minFrequency,
        maxFrequency
    ) {

        const filter =
            context.createBiquadFilter();


        filter.type =
            "bandpass";


        const center =
            Math.sqrt(
                minFrequency *
                maxFrequency
            );


        filter.frequency.value =
            this.clampFrequency(
                center,
                this.resolveSampleRate(
                    context
                )
            );


        const bandwidth =
            Math.log2(
                maxFrequency /
                minFrequency
            );


        filter.Q.value =
            this.clamp(
                1 /
                bandwidth,
                0.20,
                1.40
            );


        return filter;
    }


    // ======================================
    // CRIAR GANHO REGIONAL
    // ======================================

    createGain(
        context,
        value = 1
    ) {

        const gain =
            context.createGain();


        gain.gain.value =
            this.clamp(
                value,
                0,
                2
            );


        return gain;
    }


    // ======================================
    // CALCULAR CONFIGURAÇÃO REGIONAL
    // ======================================

    calculateRegionSettings(
        region,
        adaptation
    ) {

        const baseDrive =
            this.safeNumber(
                region.drive,
                0.05
            );


        const baseMix =
            this.safeNumber(
                region.mix,
                0.08
            );


        const drive =
            this.clamp(
                baseDrive *
                adaptation,
                0,
                this.maxDrive
            );


        const mix =
            this.clamp(
                baseMix *
                adaptation,
                0,
                this.maxMix
            );


        return {

            name:
                region.name,

            minFrequency:
                region.minFrequency,

            maxFrequency:
                region.maxFrequency,

            drive,

            mix
        };
    }


    // ======================================
    // CONSTRUIR REGIÃO
    // ======================================

    createRegion(
        context,
        region,
        adaptation
    ) {

        const settings =
            this.calculateRegionSettings(
                region,
                adaptation
            );


        const input =
            context.createGain();


        input.gain.value =
            1;


        const bandpass =
            this.createBandpass(
                context,
                settings.minFrequency,
                settings.maxFrequency
            );


        const shaper =
            this.createShaper(
                context,
                settings.drive
            );


        const saturatedGain =
            this.createGain(
                context,
                settings.mix
            );


        /*
         * Caminho regional:
         *
         * input
         *   ↓
         * bandpass
         *   ↓
         * shaper
         *   ↓
         * saturatedGain
         *
         * O ganho regional é baixo.
         * O sinal original permanece
         * separado no caminho DRY.
         */


        input.connect(
            bandpass
        );


        bandpass.connect(
            shaper
        );


        shaper.connect(
            saturatedGain
        );


        return {

            input,

            output:
                saturatedGain,

            settings
        };
    }


    // ======================================
    // REGIÕES ATIVAS
    // ======================================

    getActiveRegions() {

        return [

            this.regions.low,

            this.regions.lowMid,

            this.regions.mid,

            this.regions.highMid,

            this.regions.high
        ];
    }


    // ======================================
    // GANHO DE COMPENSAÇÃO
    // ======================================

    calculateCompensation(
        regionSettings
    ) {

        let totalMix =
            0;


        for (
            const settings
            of regionSettings
        ) {

            totalMix +=
                settings.mix;
        }


        /*
         * O caminho DRY é preservado em
         * ganho unitário.
         *
         * A compensação atua somente no
         * barramento WET, mantendo a
         * reconstrução pequena.
         */

        const compensation =
            1 -
            (
                totalMix *
                0.055
            );


        return this.clamp(
            compensation,
            0.94,
            1
        );
    }
        // ======================================
    // CONFIGURAÇÃO COMPLETA
    // ======================================

    calculateSettings(
        analysis
    ) {

        const adaptation =
            this.calculateAdaptation(
                analysis
            );


        const regionSettings =
            this.getActiveRegions()
                .map(
                    region =>
                        this.calculateRegionSettings(
                            region,
                            adaptation
                        )
                );


        const compensation =
            this.calculateCompensation(
                regionSettings
            );


        return {

            version:
                this.version,

            adaptation,

            compensation,

            dryGain:
                this.dryGain,

            wetGain:
                this.wetGain,

            maxDrive:
                this.maxDrive,

            maxMix:
                this.maxMix,

            regions:
                regionSettings
        };
    }


    // ======================================
    // CRIAR PROCESSADOR
    // ======================================

    createProcessor(
        context,
        analysis
    ) {

        if (
            !context
        ) {

            throw new Error(
                "VocalSaturation requer um AudioContext."
            );
        }


        if (
            typeof context.createGain !==
            "function"
        ) {

            throw new Error(
                "Contexto de áudio inválido para VocalSaturation."
            );
        }


        const settings =
            this.calculateSettings(
                analysis
            );


        this.lastSettings =
            settings;


        // ==================================
        // ENTRADA PRINCIPAL
        // ==================================

        const input =
            context.createGain();


        input.gain.value =
            1;


        // ==================================
        // CAMINHO DRY
        // ==================================
        //
        // O vocal original permanece
        // integralmente presente.
        //
        // ==================================

        const dryGain =
            this.createGain(
                context,
                settings.dryGain
            );


        // ==================================
        // BARRAMENTO WET
        // ==================================
        //
        // Recebe somente o conteúdo
        // harmônico adicional.
        //
        // ==================================

        const wetBus =
            context.createGain();


        wetBus.gain.value =
            this.clamp(
                settings.wetGain *
                settings.compensation,
                0,
                1
            );


        // ==================================
        // SOMA FINAL
        // ==================================

        const output =
            context.createGain();


        output.gain.value =
            this.clamp(
                this.outputTrim,
                0,
                1
            );


        // ==================================
        // CONEXÃO DRY
        // ==================================

        input.connect(
            dryGain
        );


        dryGain.connect(
            output
        );


        // ==================================
        // CONSTRUIR REGIÕES
        // ==================================

        const regionProcessors =
            [];


        for (
            const regionSettings
            of settings.regions
        ) {

            const processor =
                this.createRegion(
                    context,
                    regionSettings,
                    1
                );


            regionProcessors.push(
                processor
            );


            /*
             * A entrada original alimenta
             * cada banda em paralelo.
             *
             * Essas bandas NÃO substituem
             * o caminho DRY.
             */

            input.connect(
                processor.input
            );


            processor.output.connect(
                wetBus
            );
        }


        // ==================================
        // CONEXÃO WET
        // ==================================

        wetBus.connect(
            output
        );


        return {

            input,

            output,

            settings,

            regions:
                regionProcessors
        };
    }


    // ======================================
    // ÚLTIMA CONFIGURAÇÃO
    // ======================================

    getLastSettings() {

        if (
            !this.lastSettings
        ) {

            return null;
        }


        return {

            ...this.lastSettings,

            regions:
                this.lastSettings.regions
                    ? this.lastSettings.regions.map(
                        region => ({
                            ...region
                        })
                    )
                    : []
        };
    }
        // ======================================
    // RESET
    // ======================================

    reset() {

        this.lastSettings =
            null;
    }


    // ======================================
    // ATUALIZAR PARÂMETROS DE UMA REGIÃO
    // ======================================
    //
    // Este método não processa áudio.
    //
    // Ele apenas permite alteração
    // controlada dos parâmetros locais.
    //
    // ======================================

    setRegion(
        regionName,
        options = {}
    ) {

        if (
            !this.regions[regionName]
        ) {

            return false;
        }


        const region =
            this.regions[regionName];


        if (
            Number.isFinite(
                options.minFrequency
            )
        ) {

            region.minFrequency =
                this.clamp(
                    options.minFrequency,
                    20,
                    18000
                );
        }


        if (
            Number.isFinite(
                options.maxFrequency
            )
        ) {

            region.maxFrequency =
                this.clamp(
                    options.maxFrequency,
                    region.minFrequency +
                    10,
                    20000
                );
        }


        if (
            Number.isFinite(
                options.drive
            )
        ) {

            region.drive =
                this.clamp(
                    options.drive,
                    0,
                    this.maxDrive
                );
        }


        if (
            Number.isFinite(
                options.mix
            )
        ) {

            region.mix =
                this.clamp(
                    options.mix,
                    0,
                    this.maxMix
                );
        }


        return true;
    }


    // ======================================
    // DESATIVAR REGIÃO
    // ======================================

    disableRegion(
        regionName
    ) {

        if (
            !this.regions[regionName]
        ) {

            return false;
        }


        this.regions[regionName]
            .drive =
            0;


        this.regions[regionName]
            .mix =
            0;


        return true;
    }


    // ======================================
    // RESTAURAR REGIÕES PADRÃO
    // ======================================

    resetRegions() {

        this.regions = {

            low: {

                name:
                    "low",

                minFrequency:
                    35,

                maxFrequency:
                    110,

                drive:
                    0.055,

                mix:
                    0.080
            },


            lowMid: {

                name:
                    "lowMid",

                minFrequency:
                    110,

                maxFrequency:
                    320,

                drive:
                    0.065,

                mix:
                    0.090
            },


            mid: {

                name:
                    "mid",

                minFrequency:
                    320,

                maxFrequency:
                    1200,

                drive:
                    0.075,

                mix:
                    0.100
            },


            highMid: {

                name:
                    "highMid",

                minFrequency:
                    1200,

                maxFrequency:
                    4200,

                drive:
                    0.060,

                mix:
                    0.085
            },


            high: {

                name:
                    "high",

                minFrequency:
                    4200,

                maxFrequency:
                    12000,

                drive:
                    0.035,

                mix:
                    0.050
            }
        };
    }


    // ======================================
    // CONFIGURAÇÃO CONSERVADORA
    // ======================================

    setConservativeMode() {

        this.maxDrive =
            0.10;


        this.maxMix =
            0.12;


        this.outputTrim =
            0.99;


        this.dryGain =
            1.0;


        this.wetGain =
            1.0;


        this.regions.low.drive =
            0.035;


        this.regions.low.mix =
            0.055;


        this.regions.lowMid.drive =
            0.040;


        this.regions.lowMid.mix =
            0.060;


        this.regions.mid.drive =
            0.045;


        this.regions.mid.mix =
            0.065;


        this.regions.highMid.drive =
            0.035;
                    this.regions.highMid.mix =
            0.050;


        this.regions.high.drive =
            0.020;


        this.regions.high.mix =
            0.030;
    }


    // ======================================
    // CONFIGURAÇÃO PADRÃO
    // ======================================

    setDefaultMode() {

        this.maxDrive =
            0.16;


        this.maxMix =
            0.18;


        this.outputTrim =
            0.985;


        this.dryGain =
            1.0;


        this.wetGain =
            1.0;


        this.resetRegions();
    }


    // ======================================
    // DIAGNÓSTICO LOCAL
    // ======================================
    //
    // Somente retorna os parâmetros atuais.
    //
    // Não processa áudio.
    // Não altera análise.
    // Não altera inteligência.
    //
    // ======================================

    getDiagnosticSnapshot() {

        return {

            version:
                this.version,

            maxDrive:
                this.maxDrive,

            maxMix:
                this.maxMix,

            outputTrim:
                this.outputTrim,

            dryGain:
                this.dryGain,

            wetGain:
                this.wetGain,

            regions: {

                low:
                    {
                        ...this.regions.low
                    },

                lowMid:
                    {
                        ...this.regions.lowMid
                    },

                mid:
                    {
                        ...this.regions.mid
                    },

                highMid:
                    {
                        ...this.regions.highMid
                    },

                high:
                    {
                        ...this.regions.high
                    }
            }
        };
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.VocalSaturation =
        VocalSaturation;
}