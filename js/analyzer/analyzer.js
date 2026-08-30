"use strict";


class VocalAnalyzer {

    constructor(options = {}) {

        this.options = {

            frameSize: 2048,

            hopSize: 512,

            minFrequency: 20,

            maxFrequency: 20000,

            silenceDb: -60,

            vocalActivityDb: -45,

            pitchMinHz: 70,

            pitchMaxHz: 500,

            bodyLowHz: 120,

            bodyHighHz: 300,

            boxinessLowHz: 250,

            boxinessHighHz: 600,

            presenceLowHz: 2000,

            presenceHighHz: 5000,

            harshnessLowHz: 2500,

            harshnessHighHz: 6000,

            sibilanceLowHz: 4000,

            sibilanceHighHz: 12000,

            airLowHz: 10000,

            airHighHz: 16000,

            ...options
        };


        this.profile =
            null;
    }


    analyze(
        audioBuffer
    ) {

        this.validateAudioBuffer(
            audioBuffer
        );


        const mono =
            this.createMonoSignal(
                audioBuffer
            );


        const signal =
            this.analyzeSignal(
                mono,
                audioBuffer.sampleRate
            );


        const frames =
            this.analyzeFrames(
                mono,
                audioBuffer.sampleRate
            );


        const dynamics =
            this.analyzeDynamics(
                frames
            );


        const spectrum =
            this.aggregateSpectrum(
                frames,
                audioBuffer.sampleRate
            );


        const bands =
            this.analyzeBands(
                frames,
                audioBuffer.sampleRate
            );


        const harmonicity =
            this.analyzeHarmonicity(
                frames,
                audioBuffer.sampleRate
            );


        const temporal =
            this.analyzeTemporalBehavior(
                frames
            );


        const environment =
            this.analyzeEnvironment(
                frames
            );


        const processingRisk =
            this.analyzeProcessingRisk(
                signal,
                dynamics,
                spectrum,
                harmonicity
            );


        const profile =
            this.buildProfile({

                audioBuffer,

                signal,

                frames,

                dynamics,

                spectrum,

                bands,

                harmonicity,

                temporal,

                environment,

                processingRisk
            });


        this.profile =
            profile;


        return profile;
    }


    validateAudioBuffer(
        audioBuffer
    ) {

        if (
            !audioBuffer
        ) {

            throw new Error(
                "Analyzer: AudioBuffer inexistente."
            );
        }


        if (
            typeof audioBuffer.length !==
            "number" ||

            typeof audioBuffer.sampleRate !==
            "number" ||

            typeof audioBuffer.numberOfChannels !==
            "number"
        ) {

            throw new Error(
                "Analyzer: AudioBuffer inválido."
            );
        }


        if (
            audioBuffer.length <= 0 ||

            audioBuffer.sampleRate <= 0 ||

            audioBuffer.numberOfChannels <= 0
        ) {

            throw new Error(
                "Analyzer: áudio vazio ou inválido."
            );
        }
    }


    createMonoSignal(
        audioBuffer
    ) {

        const length =
            audioBuffer.length;


        const channels =
            audioBuffer.numberOfChannels;


        const mono =
            new Float32Array(
                length
            );


        for (
            let channel = 0;
            channel < channels;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );


            for (
                let i = 0;
                i < length;
                i++
            ) {

                mono[i] +=
                    data[i] /
                    channels;
            }
        }


        return mono;
    }


    analyzeSignal(
        signal,
        sampleRate
    ) {

        let peak = 0;

        let sum = 0;

        let sumSquares = 0;

        let clippedSamples = 0;


        for (
            let i = 0;
            i < signal.length;
            i++
        ) {

            const sample =
                signal[i];


            const absolute =
                Math.abs(sample);


            peak =
                Math.max(
                    peak,
                    absolute
                );


            sum +=
                sample;


            sumSquares +=
                sample *
                sample;


            if (
                absolute >=
                0.999
            ) {

                clippedSamples++;
            }
        }


        const mean =
            signal.length > 0

                ? sum /
                  signal.length

                : 0;


        const rms =
            signal.length > 0

                ? Math.sqrt(
                    sumSquares /
                    signal.length
                )

                : 0;


        const crestFactor =
            rms > 1e-12

                ? peak /
                  rms

                : 0;


        return {

            mean,

            rms,

            rmsDb:
                this.toDb(rms),

            peak,

            peakDb:
                this.toDb(peak),

            crestFactor,

            crestFactorDb:
                this.toDb(
                    crestFactor
                ),

            dcOffset:
                mean,

            duration:
                signal.length /
                sampleRate,

            clippingRatio:
                signal.length > 0

                    ? clippedSamples /
                      signal.length

                    : 0
        };
    }


analyzeFrames(
    signal,
    sampleRate
) {

    const frameSize =
        this.options.frameSize;


    const hopSize =
        this.options.hopSize;


    const frames = [];


    if (
        signal.length === 0
    ) {

        return frames;
    }


    let frameIndex = 0;


    /*
     * Áudio menor que um frame:
     * cria um único frame preenchido
     * com zeros apenas no restante.
     */

    if (
        signal.length <
        frameSize
    ) {

        const frame =
            new Float32Array(
                frameSize
            );


        frame.set(
            signal
        );


        frames.push(
            this.analyzeFrame(
                frame,
                sampleRate,
                frameIndex
            )
        );


        return frames;
    }


    /*
     * Primeiro processamos todos os
     * frames completos.
     */

    let start = 0;


    for (
        ;
        start + frameSize <=
        signal.length;
        start += hopSize
    ) {

        const frame =
            signal.slice(
                start,
                start + frameSize
            );


        frames.push(
            this.analyzeFrame(
                frame,
                sampleRate,
                frameIndex
            )
        );


        frameIndex++;
    }


    /*
     * Se ainda restaram amostras depois
     * do último frame completo, elas também
     * precisam entrar na análise.
     *
     * O restante do frame é preenchido com
     * zeros para manter o tamanho exigido
     * pela FFT.
     */

    if (
        start < signal.length
    ) {

        const frame =
            new Float32Array(
                frameSize
            );


        frame.set(
            signal.slice(
                start,
                signal.length
            )
        );


        frames.push(
            this.analyzeFrame(
                frame,
                sampleRate,
                frameIndex
            )
        );
    }


    return frames;
}


    analyzeFrame(
        frame,
        sampleRate,
        frameIndex
    ) {

        const rms =
            this.calculateRms(
                frame
            );


        const peak =
            this.calculatePeak(
                frame
            );


        const centered =
            this.removeMean(
                frame
            );


        const windowed =
            this.applyHannWindow(
                centered
            );


        const spectrum =
            this.calculateSpectrum(
                windowed
            );


        const spectral =
            this.calculateSpectralFeatures(
                spectrum,
                sampleRate
            );


        const bandEnergy =
            this.calculateBandEnergies(
                spectrum,
                sampleRate
            );


        return {

            index:
                frameIndex,

            signal:
                frame,

            rms,

            rmsDb:
                this.toDb(rms),

            peak,

            peakDb:
                this.toDb(peak),

            spectrum,

            spectral,

            bandEnergy
        };
    }
        applyHannWindow(
        signal
    ) {

        const output =
            new Float32Array(
                signal.length
            );


        const denominator =
            signal.length - 1;


        for (
            let i = 0;
            i < signal.length;
            i++
        ) {

            const window =
                denominator > 0

                    ? 0.5 -
                      0.5 *
                      Math.cos(
                          2 *
                          Math.PI *
                          i /
                          denominator
                      )

                    : 1;


            output[i] =
                signal[i] *
                window;
        }


        return output;
    }


    calculateRms(
        signal
    ) {

        let sum = 0;


        for (
            let i = 0;
            i < signal.length;
            i++
        ) {

            sum +=
                signal[i] *
                signal[i];
        }


        return signal.length > 0

            ? Math.sqrt(
                sum /
                signal.length
            )

            : 0;
    }


    calculatePeak(
        signal
    ) {

        let peak = 0;


        for (
            let i = 0;
            i < signal.length;
            i++
        ) {

            peak =
                Math.max(
                    peak,
                    Math.abs(
                        signal[i]
                    )
                );
        }


        return peak;
    }


    calculateSpectrum(
        signal
    ) {

        const n =
            signal.length;


        const real =
            new Float64Array(n);


        const imag =
            new Float64Array(n);


        for (
            let i = 0;
            i < n;
            i++
        ) {

            real[i] =
                signal[i];
        }


        this.fft(
            real,
            imag
        );


        const bins =
            Math.floor(
                n / 2
            ) + 1;


        const magnitude =
            new Float64Array(
                bins
            );


        for (
            let i = 0;
            i < bins;
            i++
        ) {

            magnitude[i] =
                Math.sqrt(
                    real[i] *
                    real[i] +

                    imag[i] *
                    imag[i]
                );
        }


        return {

            magnitude,

            real,

            imag,

            fftSize:
                n
        };
    }


    fft(
        real,
        imag
    ) {

        const n =
            real.length;


        let j = 0;


        for (
            let i = 1;
            i < n;
            i++
        ) {

            let bit =
                n >> 1;


            while (
                j & bit
            ) {

                j ^=
                    bit;

                bit >>=
                    1;
            }


            j ^=
                bit;


            if (
                i < j
            ) {

                let temp =
                    real[i];

                real[i] =
                    real[j];

                real[j] =
                    temp;


                temp =
                    imag[i];

                imag[i] =
                    imag[j];

                imag[j] =
                    temp;
            }
        }


        for (
            let length = 2;
            length <= n;
            length <<= 1
        ) {

            const angle =
                -2 *
                Math.PI /
                length;


            const wLenReal =
                Math.cos(angle);


            const wLenImag =
                Math.sin(angle);


            const half =
                length >> 1;


            for (
                let i = 0;
                i < n;
                i += length
            ) {

                let wReal = 1;

                let wImag = 0;


                for (
                    let k = 0;
                    k < half;
                    k++
                ) {

                    const even =
                        i + k;


                    const odd =
                        even +
                        half;


                    const oddReal =
                        real[odd] *
                        wReal -
                        imag[odd] *
                        wImag;


                    const oddImag =
                        real[odd] *
                        wImag +
                        imag[odd] *
                        wReal;


                    const evenReal =
                        real[even];


                    const evenImag =
                        imag[even];


                    real[even] =
                        evenReal +
                        oddReal;


                    imag[even] =
                        evenImag +
                        oddImag;


                    real[odd] =
                        evenReal -
                        oddReal;


                    imag[odd] =
                        evenImag -
                        oddImag;


                    const nextReal =
                        wReal *
                        wLenReal -
                        wImag *
                        wLenImag;


                    wImag =
                        wReal *
                        wLenImag +
                        wImag *
                        wLenReal;


                    wReal =
                        nextReal;
                }
            }
        }
    }


    calculateSpectralFeatures(
        spectrum,
        sampleRate
    ) {

        const magnitude =
            spectrum.magnitude;


        const fftSize =
            spectrum.fftSize;


        let total = 0;

        let weighted = 0;

        let weightedSquared = 0;


        let arithmetic =
            0;


        let logSum = 0;


        for (
            let i = 1;
            i < magnitude.length;
            i++
        ) {

            const frequency =
                i *
                sampleRate /
                fftSize;


            if (
                frequency <
                this.options.minFrequency ||

                frequency >
                this.options.maxFrequency
            ) {

                continue;
            }


            const value =
                magnitude[i] +
                1e-12;


            total +=
                value;


            weighted +=
                frequency *
                value;


            weightedSquared +=
                frequency *
                frequency *
                value;


            arithmetic +=
                value;


            logSum +=
                Math.log(value);
        }


        const centroid =
            total > 0

                ? weighted /
                  total

                : 0;


        const variance =
            total > 0

                ? Math.max(
                    0,
                    weightedSquared /
                    total -
                    centroid *
                    centroid
                )

                : 0;


        const flatness =
            arithmetic > 0

                ? Math.exp(
                    logSum /
                    Math.max(
                        1,
                        magnitude.length
                    )
                ) /
                  (
                      arithmetic /
                      Math.max(
                          1,
                          magnitude.length
                      )
                  )

                : 0;


        return {

            centroid,

            spread:
                Math.sqrt(
                    variance
                ),

            flatness:
                this.clamp(
                    flatness,
                    0,
                    1
                ),

            entropy:
                this.calculateSpectralEntropy(
                    magnitude,
                    sampleRate,
                    fftSize
                ),

            rolloff:
                this.calculateRolloff(
                    magnitude,
                    sampleRate,
                    fftSize,
                    0.85
                ),

            slope:
                this.calculateSpectralSlope(
                    magnitude,
                    sampleRate,
                    fftSize
                ),

            contrast:
                this.calculateSpectralContrast(
                    magnitude,
                    sampleRate,
                    fftSize
                )
        };
    }
        calculateSpectralEntropy(
        magnitude,
        sampleRate,
        fftSize
    ) {

        let total = 0;

        const values = [];


        for (
            let i = 1;
            i < magnitude.length;
            i++
        ) {

            const frequency =
                i *
                sampleRate /
                fftSize;


            if (
                frequency <
                this.options.minFrequency ||

                frequency >
                this.options.maxFrequency
            ) {

                continue;
            }


            const value =
                magnitude[i];


            total +=
                value;


            values.push(
                value
            );
        }


        if (
            total <= 1e-12 ||
            values.length === 0
        ) {

            return 0;
        }


        let entropy = 0;


        for (
            const value of values
        ) {

            const probability =
                value /
                total;


            if (
                probability > 0
            ) {

                entropy -=
                    probability *
                    Math.log2(
                        probability
                    );
            }
        }


        const maximum =
            Math.log2(
                values.length
            );


        return maximum > 0

            ? this.clamp(
                entropy /
                maximum,
                0,
                1
            )

            : 0;
    }


    calculateRolloff(
        magnitude,
        sampleRate,
        fftSize,
        percentage
    ) {

        let total = 0;


        for (
            let i = 1;
            i < magnitude.length;
            i++
        ) {

            const frequency =
                i *
                sampleRate /
                fftSize;


            if (
                frequency >=
                this.options.minFrequency &&

                frequency <=
                this.options.maxFrequency
            ) {

                total +=
                    magnitude[i];
            }
        }


        if (
            total <= 1e-12
        ) {

            return 0;
        }


        const target =
            total *
            percentage;


        let accumulated = 0;


        for (
            let i = 1;
            i < magnitude.length;
            i++
        ) {

            const frequency =
                i *
                sampleRate /
                fftSize;


            if (
                frequency <
                this.options.minFrequency ||

                frequency >
                this.options.maxFrequency
            ) {

                continue;
            }


            accumulated +=
                magnitude[i];


            if (
                accumulated >=
                target
            ) {

                return frequency;
            }
        }


        return this.options.maxFrequency;
    }


    calculateSpectralSlope(
        magnitude,
        sampleRate,
        fftSize
    ) {

        let sumX = 0;

        let sumY = 0;

        let sumXY = 0;

        let sumXX = 0;

        let count = 0;


        for (
            let i = 1;
            i < magnitude.length;
            i++
        ) {

            const frequency =
                i *
                sampleRate /
                fftSize;


            if (
                frequency <
                this.options.minFrequency ||

                frequency >
                this.options.maxFrequency
            ) {

                continue;
            }


            const x =
                Math.log10(
                    frequency
                );


            const y =
                this.toDb(
                    magnitude[i]
                );


            sumX += x;

            sumY += y;

            sumXY +=
                x * y;

            sumXX +=
                x * x;

            count++;
        }


        const denominator =
            count *
            sumXX -
            sumX *
            sumX;


        if (
            count < 2 ||
            Math.abs(
                denominator
            ) < 1e-12
        ) {

            return 0;
        }


        return (
            count *
            sumXY -
            sumX *
            sumY
        ) /
        denominator;
    }


    calculateSpectralContrast(
        magnitude,
        sampleRate,
        fftSize
    ) {

        const bands = [

            [80, 160],

            [160, 315],

            [315, 630],

            [630, 1250],

            [1250, 2500],

            [2500, 5000],

            [5000, 10000],

            [10000, 16000]
        ];


        const contrasts = [];


        for (
            const range of bands
        ) {

            const values = [];


            for (
                let i = 1;
                i < magnitude.length;
                i++
            ) {

                const frequency =
                    i *
                    sampleRate /
                    fftSize;


                if (
                    frequency >=
                    range[0] &&

                    frequency <=
                    range[1]
                ) {

                    values.push(
                        magnitude[i]
                    );
                }
            }


            if (
                values.length < 4
            ) {

                continue;
            }


            values.sort(
                (
                    a,
                    b
                ) =>
                    a - b
            );


            const low =
                values[
                    Math.floor(
                        values.length *
                        0.10
                    )
                ] +
                1e-12;


            const high =
                values[
                    Math.min(
                        values.length - 1,

                        Math.floor(
                            values.length *
                            0.90
                        )
                    )
                ] +
                1e-12;


            contrasts.push(
                this.toDb(
                    high /
                    low
                )
            );
        }


        return contrasts.length > 0

            ? this.mean(
                contrasts
            )

            : 0;
    }


    calculateBandEnergies(
        spectrum,
        sampleRate
    ) {

        const definitions = {

            sub:
                [20, 60],

            deepBass:
                [60, 120],

            body:
                [120, 250],

            bodyLowMid:
                [250, 500],

            lowMid:
                [500, 1000],

            intelligibility:
                [1000, 2000],

            presence:
                [2000, 3000],

            aggression:
                [3000, 5000],

            harshness:
                [5000, 8000],

            brilliance:
                [8000, 12000],

            air:
                [12000, 16000],

            ultraAir:
                [16000, 20000]
        };


        const result = {};


        for (
            const name in definitions
        ) {

            const range =
                definitions[name];


            result[name] =
                this.calculateBandEnergy(
                    spectrum,
                    sampleRate,
                    range[0],
                    range[1]
                );
        }


        return result;
    }


    calculateBandEnergy(
        spectrum,
        sampleRate,
        minFrequency,
        maxFrequency
    ) {

        const magnitude =
            spectrum.magnitude;


        const fftSize =
            spectrum.fftSize;


        const minBin =
            Math.max(
                1,
                Math.floor(
                    minFrequency *
                    fftSize /
                    sampleRate
                )
            );


        const maxBin =
            Math.min(
                magnitude.length - 1,

                Math.ceil(
                    maxFrequency *
                    fftSize /
                    sampleRate
                )
            );


        let energy = 0;


        for (
            let i = minBin;
            i <= maxBin;
            i++
        ) {

            energy +=
                magnitude[i] *
                magnitude[i];
        }


        return energy;
    }
        aggregateSpectrum(
        frames
    ) {

        if (
            frames.length === 0
        ) {

            return {

                magnitude:
                    new Float64Array(0),

                spectral: {

                    centroid: 0,

                    spread: 0,

                    flatness: 0,

                    entropy: 0,

                    rolloff: 0,

                    slope: 0,

                    contrast: 0,

                    flux: 0
                }
            };
        }


        const length =
            frames[0]
                .spectrum
                .magnitude
                .length;


        const magnitude =
            new Float64Array(
                length
            );


        let centroid = 0;

        let spread = 0;

        let flatness = 0;

        let entropy = 0;

        let rolloff = 0;

        let slope = 0;

        let contrast = 0;

        let flux = 0;

        let fluxCount = 0;


        let previous =
            null;


        for (
            const frame of frames
        ) {

            const current =
                frame.spectrum.magnitude;


            for (
                let i = 0;
                i < length;
                i++
            ) {

                magnitude[i] +=
                    current[i];
            }


            centroid +=
                frame.spectral.centroid;


            spread +=
                frame.spectral.spread;


            flatness +=
                frame.spectral.flatness;


            entropy +=
                frame.spectral.entropy;


            rolloff +=
                frame.spectral.rolloff;


            slope +=
                frame.spectral.slope;


            contrast +=
                frame.spectral.contrast;


            if (
                previous
            ) {

                flux +=
                    this.calculateSpectralFlux(
                        previous,
                        current
                    );


                fluxCount++;
            }


            previous =
                current;
        }


        const count =
            frames.length;


        for (
            let i = 0;
            i < length;
            i++
        ) {

            magnitude[i] /=
                count;
        }


        return {

            magnitude,

            spectral: {

                centroid:
                    centroid /
                    count,

                spread:
                    spread /
                    count,

                flatness:
                    flatness /
                    count,

                entropy:
                    entropy /
                    count,

                rolloff:
                    rolloff /
                    count,

                slope:
                    slope /
                    count,

                contrast:
                    contrast /
                    count,

                flux:
                    fluxCount > 0

                        ? flux /
                          fluxCount

                        : 0
            }
        };
    }


    calculateSpectralFlux(
        previous,
        current
    ) {

        const length =
            Math.min(
                previous.length,
                current.length
            );


        let sum = 0;


        for (
            let i = 1;
            i < length;
            i++
        ) {

            const increase =
                Math.max(
                    0,
                    current[i] -
                    previous[i]
                );


            sum +=
                increase *
                increase;
        }


        return Math.sqrt(
            sum /
            Math.max(
                1,
                length
            )
        );
    }


    analyzeBands(
        frames
    ) {

        const totals = {

            sub: 0,

            deepBass: 0,

            body: 0,

            bodyLowMid: 0,

            lowMid: 0,

            intelligibility: 0,

            presence: 0,

            aggression: 0,

            harshness: 0,

            brilliance: 0,

            air: 0,

            ultraAir: 0
        };


        if (
            frames.length === 0
        ) {

            return this.createEmptyBandProfile();
        }


        for (
            const frame of frames
        ) {

            for (
                const name in totals
            ) {

                totals[name] +=
                    frame.bandEnergy[name];
            }
        }


        for (
            const name in totals
        ) {

            totals[name] /=
                frames.length;
        }


        const totalEnergy =
            Object.values(
                totals
            ).reduce(
                (
                    sum,
                    value
                ) =>
                    sum + value,
                0
            ) +
            1e-12;


        const normalized = {};


        for (
            const name in totals
        ) {

            normalized[name] =
                this.clamp(
                    totals[name] /
                    totalEnergy,
                    0,
                    1
                );
        }


        return {

            raw:
                totals,

            normalized,

            bodyScore:
                this.relativeBandScore(
                    normalized.body +
                    normalized.deepBass,

                    normalized.lowMid +
                    normalized.intelligibility
                ),

            boxinessScore:
                this.relativeBandScore(
                    normalized.bodyLowMid,

                    normalized.body +
                    normalized.lowMid +
                    normalized.intelligibility
                ),

            presenceScore:
                this.relativeBandScore(
                    normalized.presence +
                    normalized.intelligibility,

                    normalized.lowMid +
                    normalized.aggression
                ),

            brightnessScore:
                this.relativeBandScore(
                    normalized.aggression +
                    normalized.harshness +
                    normalized.brilliance,

                    normalized.body +
                    normalized.lowMid +
                    normalized.presence
                ),

            airScore:
                this.relativeBandScore(
                    normalized.air +
                    normalized.ultraAir,

                    normalized.brilliance +
                    normalized.presence
                )
        };
    }


    createEmptyBandProfile() {

        const names = [

            "sub",

            "deepBass",

            "body",

            "bodyLowMid",

            "lowMid",

            "intelligibility",

            "presence",

            "aggression",

            "harshness",

            "brilliance",

            "air",

            "ultraAir"
        ];


        const raw = {};

        const normalized = {};


        for (
            const name of names
        ) {

            raw[name] = 0;

            normalized[name] = 0;
        }


        return {

            raw,

            normalized,

            bodyScore: 0,

            boxinessScore: 0,

            presenceScore: 0,

            brightnessScore: 0,

            airScore: 0
        };
    }


    relativeBandScore(
        numerator,
        denominator
    ) {

        return this.clamp(
            2 *
            numerator /
            (
                numerator +
                denominator +
                1e-12
            ),
            0,
            1
        );
    }
        analyzeDynamics(
        frames
    ) {

        if (
            frames.length === 0
        ) {

            return {

                rmsMean: 0,

                rmsMedian: 0,

                rmsMin: 0,

                rmsMax: 0,

                rmsStd: 0,

                dynamicRangeDb: 0,

                crestFactor: 0,

                crestFactorDb: 0,

                activity: 0,

                silenceRatio: 1,

                frameCount: 0
            };
        }


        const rmsValues =
            frames.map(
                frame =>
                    frame.rms
            );


        const peakValues =
            frames.map(
                frame =>
                    frame.peak
            );


        const sorted =
            [...rmsValues].sort(
                (
                    a,
                    b
                ) =>
                    a - b
            );


        const active =
            rmsValues.filter(
                value =>
                    this.toDb(
                        value
                    ) >
                    this.options
                        .vocalActivityDb
            );


        const lower =
            active.length > 0

                ? this.percentile(
                    [...active].sort(
                        (
                            a,
                            b
                        ) =>
                            a - b
                    ),
                    0.10
                )

                : 0;


        const upper =
            active.length > 0

                ? this.percentile(
                    [...active].sort(
                        (
                            a,
                            b
                        ) =>
                            a - b
                    ),
                    0.90
                )

                : 0;


        return {

            rmsMean:
                this.mean(
                    rmsValues
                ),

            rmsMedian:
                this.median(
                    sorted
                ),

            rmsMin:
                Math.min(
                    ...rmsValues
                ),

            rmsMax:
                Math.max(
                    ...rmsValues
                ),

            rmsStd:
                this.standardDeviation(
                    rmsValues
                ),

            dynamicRangeDb:
                active.length > 0

                    ? this.toDb(
                        upper /
                        Math.max(
                            lower,
                            1e-8
                        )
                    )

                    : 0,

            crestFactor:
                this.mean(
                    peakValues
                ) /
                Math.max(
                    this.mean(
                        rmsValues
                    ),
                    1e-8
                ),

            crestFactorDb:
                this.toDb(
                    this.mean(
                        peakValues
                    ) /
                    Math.max(
                        this.mean(
                            rmsValues
                        ),
                        1e-8
                    )
                ),

            activity:
                rmsValues.length > 0

                    ? active.length /
                      rmsValues.length

                    : 0,

            silenceRatio:
                rmsValues.length > 0

                    ? 1 -
                      active.length /
                      rmsValues.length

                    : 1,

            frameCount:
                frames.length
        };
    }


    analyzeHarmonicity(
        frames,
        sampleRate
    ) {

        const periodicityValues = [];

        const pitchValues = [];

        const hnrValues = [];

        const cppValues = [];


        for (
            const frame of frames
        ) {

            if (
                frame.rms <=
                1e-6
            ) {

                continue;
            }


            const periodicity =
                this.estimatePeriodicity(
                    frame.signal,
                    sampleRate
                );


            const pitch =
                this.estimatePitch(
                    frame.signal,
                    sampleRate
                );


            const hnr =
                this.estimateHnr(
                    periodicity
                );


            const cpp =
                this.estimateCpp(
                    frame.signal,
                    sampleRate
                );


            periodicityValues.push(
                periodicity
            );


            hnrValues.push(
                hnr
            );


            cppValues.push(
                cpp
            );


            if (
                pitch > 0
            ) {

                pitchValues.push(
                    pitch
                );
            }
        }


        const voiced =
            periodicityValues.filter(
                value =>
                    value >= 0.45
            );


        return {

            hnrDb:
                this.robustMean(
                    hnrValues
                ),

            cppDb:
                this.robustMean(
                    cppValues
                ),

            periodicity:
                this.robustMean(
                    periodicityValues
                ),

            voicedRatio:
                periodicityValues.length > 0

                    ? voiced.length /
                      periodicityValues.length

                    : 0,

            pitchEstimateHz:
                this.robustMean(
                    pitchValues
                )
        };
    }


    estimatePeriodicity(
        signal,
        sampleRate
    ) {

        const centered =
            this.removeMean(
                signal
            );


        const minLag =
            Math.floor(
                sampleRate /
                this.options.pitchMaxHz
            );


        const maxLag =
            Math.min(
                Math.floor(
                    sampleRate /
                    this.options.pitchMinHz
                ),

                centered.length - 2
            );


        if (
            maxLag <= minLag
        ) {

            return 0;
        }


        let energy = 0;


        for (
            let i = 0;
            i < centered.length;
            i++
        ) {

            energy +=
                centered[i] *
                centered[i];
        }


        if (
            energy <= 1e-12
        ) {

            return 0;
        }


        let best =
            0;


        for (
            let lag = minLag;
            lag <= maxLag;
            lag++
        ) {

            let correlation = 0;

            let lagEnergy = 0;


            for (
                let i = 0;
                i + lag <
                centered.length;
                i++
            ) {

                correlation +=
                    centered[i] *
                    centered[i + lag];


                lagEnergy +=
                    centered[i + lag] *
                    centered[i + lag];
            }


            const denominator =
                Math.sqrt(
                    energy *
                    Math.max(
                        lagEnergy,
                        1e-12
                    )
                );


            if (
                denominator <=
                0
            ) {

                continue;
            }


            const normalized =
                correlation /
                denominator;


            best =
                Math.max(
                    best,
                    normalized
                );
        }


        return this.clamp(
            best,
            0,
            1
        );
    }


    estimatePitch(
        signal,
        sampleRate
    ) {

        const centered =
            this.removeMean(
                signal
            );


        const minLag =
            Math.floor(
                sampleRate /
                this.options.pitchMaxHz
            );


        const maxLag =
            Math.min(
                Math.floor(
                    sampleRate /
                    this.options.pitchMinHz
                ),

                centered.length - 2
            );


        let best =
            0;


        let bestLag =
            0;


        let energy = 0;


        for (
            let i = 0;
            i < centered.length;
            i++
        ) {

            energy +=
                centered[i] *
                centered[i];
        }


        if (
            energy <= 1e-12
        ) {

            return 0;
        }


        for (
            let lag = minLag;
            lag <= maxLag;
            lag++
        ) {

            let correlation = 0;

            let lagEnergy = 0;


            for (
                let i = 0;
                i + lag <
                centered.length;
                i++
            ) {

                correlation +=
                    centered[i] *
                    centered[i + lag];


                lagEnergy +=
                    centered[i + lag] *
                    centered[i + lag];
            }


            const denominator =
                Math.sqrt(
                    energy *
                    Math.max(
                        lagEnergy,
                        1e-12
                    )
                );


            const value =
                denominator > 0

                    ? correlation /
                      denominator

                    : 0;


            if (
                value >
                best
            ) {

                best =
                    value;

                bestLag =
                    lag;
            }
        }


        if (
            best < 0.45 ||
            bestLag <= 0
        ) {

            return 0;
        }


        return sampleRate /
            bestLag;
    }


    estimateHnr(
        periodicity
    ) {

        const periodic =
            this.clamp(
                periodicity,
                1e-6,
                0.999999
            );


        return 10 *
            Math.log10(
                periodic /
                (
                    1 -
                    periodic
                )
            );
    }
        estimateCpp(
        signal,
        sampleRate
    ) {

        const frame =
            this.removeMean(
                signal
            );


        const windowed =
            this.applyHannWindow(
                frame
            );


        const spectrum =
            this.calculateSpectrum(
                windowed
            );


        const magnitude =
            spectrum.magnitude;


        const n =
            spectrum.fftSize;


        const logSpectrum =
            new Float64Array(
                n
            );


        /*
         * Construímos o espectro logarítmico
         * completo usando a simetria da FFT.
         */

        logSpectrum[0] =
            Math.log(
                magnitude[0] +
                1e-12
            );


        for (
            let i = 1;
            i < magnitude.length;
            i++
        ) {

            const value =
                Math.log(
                    magnitude[i] +
                    1e-12
                );


            logSpectrum[i] =
                value;


            const mirror =
                n - i;


            if (
                mirror >= 0 &&
                mirror < n
            ) {

                logSpectrum[mirror] =
                    value;
            }
        }


        const cepstrum =
            this.realInverseTransform(
                logSpectrum
            );


        const minQuefrency =
            Math.floor(
                sampleRate /
                this.options.pitchMaxHz
            );


        const maxQuefrency =
            Math.min(
                Math.floor(
                    sampleRate /
                    this.options.pitchMinHz
                ),

                Math.floor(
                    cepstrum.length /
                    2
                )
            );


        if (
            maxQuefrency <=
            minQuefrency
        ) {

            return 0;
        }


        let peak =
            -Infinity;


        for (
            let i = minQuefrency;
            i <= maxQuefrency;
            i++
        ) {

            peak =
                Math.max(
                    peak,
                    cepstrum[i]
                );
        }


        let sum = 0;

        let count = 0;


        for (
            let i = minQuefrency;
            i <= maxQuefrency;
            i++
        ) {

            sum +=
                cepstrum[i];

            count++;
        }


        const mean =
            count > 0

                ? sum /
                  count

                : 0;


        /*
         * CPP = proeminência do pico cepstral.
         *
         * A unidade interna é log-amplitude.
         */

        return Math.max(
            0,
            peak - mean
        );
    }


    realInverseTransform(
        realInput
    ) {

        const n =
            realInput.length;


        const real =
            new Float64Array(
                n
            );


        const imag =
            new Float64Array(
                n
            );


        for (
            let i = 0;
            i < n;
            i++
        ) {

            real[i] =
                realInput[i];
        }


        this.inverseFft(
            real,
            imag
        );


        return real;
    }


    inverseFft(
        real,
        imag
    ) {

        const n =
            real.length;


        for (
            let i = 0;
            i < n;
            i++
        ) {

            imag[i] =
                -imag[i];
        }


        this.fft(
            real,
            imag
        );


        for (
            let i = 0;
            i < n;
            i++
        ) {

            real[i] /=
                n;


            imag[i] =
                -imag[i] /
                n;
        }
    }


    analyzeTemporalBehavior(
        frames
    ) {

        if (
            frames.length === 0
        ) {

            return {

                harshnessScore: 0,

                sibilanceScore: 0,

                harshnessDensity: 0,

                sibilanceDensity: 0,

                transientDensity: 0,

                frameCount: 0
            };
        }


        const totalEnergy =
            frames.map(
                frame =>
                    this.sumBandEnergy(
                        frame.bandEnergy
                    )
            );


        const harshRatios = [];

        const sibilanceRatios = [];

        const rmsValues =
            frames.map(
                frame =>
                    frame.rms
            );


        for (
            let i = 0;
            i < frames.length;
            i++
        ) {

            const total =
                totalEnergy[i] +
                1e-12;


            const harsh =
                frames[i]
                    .bandEnergy
                    .aggression +

                frames[i]
                    .bandEnergy
                    .harshness;


            const sibilance =
                frames[i]
                    .bandEnergy
                    .harshness +

                frames[i]
                    .bandEnergy
                    .brilliance;


            harshRatios.push(
                harsh /
                total
            );


            sibilanceRatios.push(
                sibilance /
                total
            );
        }


        const harshThreshold =
            this.robustThreshold(
                harshRatios,
                0.75
            );


        const sibilanceThreshold =
            this.robustThreshold(
                sibilanceRatios,
                0.82
            );


        let harshEvents = 0;

        let sibilanceEvents = 0;

        let transients = 0;


        for (
            let i = 0;
            i < frames.length;
            i++
        ) {

            if (
                harshRatios[i] >
                harshThreshold
            ) {

                harshEvents++;
            }


            if (
                sibilanceRatios[i] >
                sibilanceThreshold
            ) {

                sibilanceEvents++;
            }


            if (
                i > 0
            ) {

                const previous =
                    rmsValues[i - 1] +
                    1e-12;


                const current =
                    rmsValues[i] +
                    1e-12;


                const ratio =
                    current /
                    previous;


                if (
                    ratio > 1.8 ||
                    ratio < 0.55
                ) {

                    transients++;
                }
            }
        }


        return {

            harshnessScore:
                this.clamp(
                    this.robustMean(
                        harshRatios
                    ) *
                    4,
                    0,
                    1
                ),

            sibilanceScore:
                this.clamp(
                    this.robustMean(
                        sibilanceRatios
                    ) *
                    4,
                    0,
                    1
                ),

            harshnessDensity:
                harshEvents /
                frames.length,

            sibilanceDensity:
                sibilanceEvents /
                frames.length,

            transientDensity:
                frames.length > 1

                    ? transients /
                      (
                          frames.length -
                          1
                      )

                    : 0,

            frameCount:
                frames.length
        };
    }


    sumBandEnergy(
        bandEnergy
    ) {

        let total = 0;


        for (
            const name in bandEnergy
        ) {

            total +=
                bandEnergy[name];
        }


        return total;
    }


    robustThreshold(
        values,
        percentile
    ) {

        if (
            values.length === 0
        ) {

            return 0;
        }


        const sorted =
            [...values].sort(
                (
                    a,
                    b
                ) =>
                    a - b
            );


        const median =
            this.median(
                sorted
            );


        const upper =
            this.percentile(
                sorted,
                percentile
            );


        return Math.max(
            median +
            (
                upper -
                median
            ) *
            0.60,

            1e-8
        );
    }
        analyzeEnvironment(
        frames
    ) {

        if (
            frames.length === 0
        ) {

            return {

                activity: 0,

                silenceRatio: 1,

                residualEnergy: 0,

                tailEnergy: 0,

                dryness: 1,

                roomEvidence: 0
            };
        }


        const rms =
            frames.map(
                frame =>
                    frame.rms
            );


        const active =
            rms.filter(
                value =>
                    this.toDb(
                        value
                    ) >
                    this.options
                        .vocalActivityDb
            );


        const inactive =
            rms.filter(
                value =>
                    this.toDb(
                        value
                    ) <=
                    this.options
                        .vocalActivityDb
            );


        const activity =
            active.length /
            rms.length;


        const activeMean =
            this.mean(
                active
            );


        const inactiveMean =
            this.mean(
                inactive
            );


        const residualEnergy =
            activeMean > 1e-8

                ? this.clamp(
                    inactiveMean /
                    activeMean,
                    0,
                    1
                )

                : 0;


        let tailSum = 0;

        let tailCount = 0;


        for (
            let i = 1;
            i < rms.length;
            i++
        ) {

            const previousActive =
                this.toDb(
                    rms[i - 1]
                ) >
                this.options
                    .vocalActivityDb;


            const currentInactive =
                this.toDb(
                    rms[i]
                ) <=
                this.options
                    .vocalActivityDb;


            if (
                previousActive &&
                currentInactive
            ) {

                tailSum +=
                    rms[i] /
                    (
                        rms[i - 1] +
                        1e-12
                    );


                tailCount++;
            }
        }


        const tailEnergy =
            tailCount > 0

                ? this.clamp(
                    tailSum /
                    tailCount,
                    0,
                    1
                )

                : 0;


        const roomEvidence =
            this.clamp(
                residualEnergy *
                0.55 +
                tailEnergy *
                0.45,
                0,
                1
            );


        return {

            activity,

            silenceRatio:
                1 - activity,

            residualEnergy,

            tailEnergy,

            dryness:
                1 -
                roomEvidence,

            roomEvidence
        };
    }


    analyzeProcessingRisk(
        signal,
        dynamics,
        spectrum,
        harmonicity
    ) {

        const clipping =
            this.normalizeRange(
                signal.clippingRatio,
                0,
                0.002
            );


        const compression =
            this.normalizeRange(
                12 -
                dynamics.dynamicRangeDb,
                0,
                10
            );


        const lowCrest =
            this.normalizeRange(
                8 -
                dynamics.crestFactorDb,
                0,
                8
            );


        const flatness =
            this.normalizeRange(
                spectrum.spectral.flatness,
                0.45,
                0.85
            );


        const periodicityAnomaly =
            this.normalizeRange(
                harmonicity.periodicity,
                0,
                0.20
            );


        return {

            overall:
                this.weightedScore([

                    [clipping, 0.30],

                    [compression, 0.25],

                    [lowCrest, 0.20],

                    [flatness, 0.15],

                    [periodicityAnomaly, 0.10]
                ]),

            clipping,

            compression,

            lowCrest,

            spectral:
                flatness,

            periodicityAnomaly
        };
    }


    buildProfile(
        data
    ) {

        const {

            audioBuffer,

            signal,

            dynamics,

            spectrum,

            bands,

            harmonicity,

            temporal,

            environment,

            processingRisk

        } = data;


        const harshness =
            this.weightedScore([

                [

                    bands.normalized
                        .aggression +
                    bands.normalized
                        .harshness,

                    0.30
                ],

                [

                    temporal.harshnessScore,

                    0.40
                ],

                [

                    temporal.harshnessDensity,

                    0.15
                ],

                [

                    this.normalizeRange(
                        spectrum.spectral
                            .contrast,
                        5,
                        35
                    ),

                    0.15
                ]
            ]);


        const sibilance =
            this.weightedScore([

                [

                    bands.normalized
                        .harshness +
                    bands.normalized
                        .brilliance,

                    0.30
                ],

                [

                    temporal.sibilanceScore,

                    0.35
                ],

                [

                    temporal.sibilanceDensity,

                    0.25
                ],

                [

                    1 -
                    harmonicity.periodicity,

                    0.10
                ]
            ]);


        const harshnessConfidence =
            this.calculateFeatureConfidence(
                signal,
                temporal.frameCount,
                temporal.harshnessScore
            );


        const sibilanceConfidence =
            this.calculateFeatureConfidence(
                signal,
                temporal.frameCount,
                temporal.sibilanceScore
            );


        const toneConfidence =
            this.calculateToneConfidence(
                signal,
                bands
            );


        const dynamicsConfidence =
            this.calculateDynamicsConfidence(
                dynamics
            );


        const overallConfidence =
            this.weightedScore([

                [
                    harshnessConfidence,
                    0.20
                ],

                [
                    sibilanceConfidence,
                    0.20
                ],

                [
                    toneConfidence,
                    0.30
                ],

                [
                    dynamicsConfidence,
                    0.30
                ]
            ]);


        return {

            version:
                "1.2.0",


            analyzer:
                "SmoothVStudio VocalAnalyzer",


            analysisMode:
                "offline-multiframe",


            signal: {

                sampleRate:
                    audioBuffer.sampleRate,

                channels:
                    audioBuffer.numberOfChannels,

                length:
                    audioBuffer.length,

                duration:
                    signal.duration,

                peak:
                    signal.peak,

                peakDb:
                    signal.peakDb,

                rms:
                    signal.rms,

                rmsDb:
                    signal.rmsDb,

                crestFactor:
                    signal.crestFactor,

                crestFactorDb:
                    signal.crestFactorDb,

                dcOffset:
                    signal.dcOffset,

                clippingRatio:
                    signal.clippingRatio
            },


            dynamics: {

                rmsMean:
                    dynamics.rmsMean,

                rmsMedian:
                    dynamics.rmsMedian,

                rmsMin:
                    dynamics.rmsMin,

                rmsMax:
                    dynamics.rmsMax,

                rmsStd:
                    dynamics.rmsStd,

                dynamicRangeDb:
                    dynamics.dynamicRangeDb,

                crestFactor:
                    dynamics.crestFactor,

                crestFactorDb:
                    dynamics.crestFactorDb,

                activity:
                    dynamics.activity,

                silenceRatio:
                    dynamics.silenceRatio,

                frameCount:
                    dynamics.frameCount
            },


            spectrum: {

                centroid:
                    spectrum.spectral.centroid,

                spread:
                    spectrum.spectral.spread,

                flatness:
                    spectrum.spectral.flatness,

                entropy:
                    spectrum.spectral.entropy,

                rolloff:
                    spectrum.spectral.rolloff,

                slope:
                    spectrum.spectral.slope,

                contrast:
                    spectrum.spectral.contrast,

                flux:
                    spectrum.spectral.flux
            },


            tone: {

                body:
                    bands.bodyScore,

                boxiness:
                    bands.boxinessScore,

                presence:
                    bands.presenceScore,

                brightness:
                    bands.brightnessScore,

                air:
                    bands.airScore
            },


            bands:
                bands.normalized,


            harshness: {

                score:
                    harshness,

                confidence:
                    harshnessConfidence,

                energy:
                    bands.normalized
                        .aggression +
                    bands.normalized
                        .harshness,

                temporal:
                    temporal.harshnessScore,

                density:
                    temporal.harshnessDensity
            },


            sibilance: {

                score:
                    sibilance,

                confidence:
                    sibilanceConfidence,

                energy:
                    bands.normalized
                        .harshness +
                    bands.normalized
                        .brilliance,

                temporal:
                    temporal.sibilanceScore,

                density:
                    temporal.sibilanceDensity
            },


            harmonicity: {

                hnrDb:
                    harmonicity.hnrDb,

                cppDb:
                    harmonicity.cppDb,

                periodicity:
                    harmonicity.periodicity,

                voicedRatio:
                    harmonicity.voicedRatio,

                pitchEstimateHz:
                    harmonicity.pitchEstimateHz
            },


            transients: {

                density:
                    temporal.transientDensity
            },


            environment: {

                activity:
                    environment.activity,

                silenceRatio:
                    environment.silenceRatio,

                residualEnergy:
                    environment.residualEnergy,

                tailEnergy:
                    environment.tailEnergy,

                dryness:
                    environment.dryness,

                roomEvidence:
                    environment.roomEvidence
            },


            processingRisk:
                processingRisk,


            confidence: {

                overall:
                    overallConfidence,

                harshness:
                    harshnessConfidence,

                sibilance:
                    sibilanceConfidence,

                tone:
                    toneConfidence,

                dynamics:
                    dynamicsConfidence
            },


            recommendations: {

                treatHarshness:
                    harshness >
                    0.55 &&
                    harshnessConfidence >
                    0.60,

                treatSibilance:
                    sibilance >
                    0.55 &&
                    sibilanceConfidence >
                    0.60,

                addBody:
                    bands.bodyScore <
                    0.45 &&
                    toneConfidence >
                    0.60,

                controlBoxiness:
                    bands.boxinessScore >
                    0.55 &&
                    toneConfidence >
                    0.60,

                addAir:
                    bands.airScore <
                    0.35 &&
                    sibilance <
                    0.45 &&
                    toneConfidence >
                    0.65
            }
        };
    }
        calculateFeatureConfidence(
        signal,
        frameCount,
        evidence
    ) {

        const duration =
            this.normalizeRange(
                signal.duration,
                1,
                5
            );


        const frames =
            this.normalizeRange(
                frameCount,
                20,
                200
            );


        return this.weightedScore([

            [
                duration,
                0.35
            ],

            [
                frames,
                0.35
            ],

            [
                evidence,
                0.30
            ]
        ]);
    }


    calculateToneConfidence(
        signal,
        bands
    ) {

        const duration =
            this.normalizeRange(
                signal.duration,
                1,
                5
            );


        const energy =
            Object.values(
                bands.normalized
            ).reduce(
                (
                    sum,
                    value
                ) =>
                    sum + value,
                0
            );


        return this.weightedScore([

            [
                duration,
                0.50
            ],

            [
                this.clamp(
                    energy,
                    0,
                    1
                ),
                0.50
            ]
        ]);
    }


    calculateDynamicsConfidence(
        dynamics
    ) {

        const frames =
            this.normalizeRange(
                dynamics.frameCount,
                20,
                200
            );


        const activity =
            dynamics.activity >
            0.05

                ? 1

                : 0;


        return this.weightedScore([

            [
                frames,
                0.60
            ],

            [
                activity,
                0.40
            ]
        ]);
    }


    robustMean(
        values
    ) {

        if (
            !values ||
            values.length === 0
        ) {

            return 0;
        }


        const valid =
            values
                .filter(
                    value =>
                        Number.isFinite(
                            value
                        )
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a - b
                );


        if (
            valid.length === 0
        ) {

            return 0;
        }


        const start =
            Math.floor(
                valid.length *
                0.10
            );


        const end =
            Math.ceil(
                valid.length *
                0.90
            );


        return this.mean(
            valid.slice(
                start,
                Math.max(
                    start + 1,
                    end
                )
            )
        );
    }


    mean(
        values
    ) {

        if (
            !values ||
            values.length === 0
        ) {

            return 0;
        }


        let sum = 0;


        for (
            const value of values
        ) {

            if (
                Number.isFinite(
                    value
                )
            ) {

                sum +=
                    value;
            }
        }


        return sum /
            values.length;
    }


    median(
        sortedValues
    ) {

        if (
            !sortedValues ||
            sortedValues.length === 0
        ) {

            return 0;
        }


        const middle =
            Math.floor(
                sortedValues.length /
                2
            );


        if (
            sortedValues.length %
            2 === 0
        ) {

            return (
                sortedValues[
                    middle - 1
                ] +
                sortedValues[
                    middle
                ]
            ) /
            2;
        }


        return sortedValues[
            middle
        ];
    }


    percentile(
        sortedValues,
        percentile
    ) {

        if (
            !sortedValues ||
            sortedValues.length === 0
        ) {

            return 0;
        }


        const position =
            (
                sortedValues.length -
                1
            ) *
            this.clamp(
                percentile,
                0,
                1
            );


        const lower =
            Math.floor(
                position
            );


        const upper =
            Math.ceil(
                position
            );


        if (
            lower === upper
        ) {

            return sortedValues[
                lower
            ];
        }


        const weight =
            position -
            lower;


        return (
            sortedValues[lower] *
            (
                1 -
                weight
            )
        ) +
        (
            sortedValues[upper] *
            weight
        );
    }


    standardDeviation(
        values
    ) {

        if (
            values.length === 0
        ) {

            return 0;
        }


        const average =
            this.mean(
                values
            );


        let sum = 0;


        for (
            const value of values
        ) {

            sum +=
                Math.pow(
                    value -
                    average,
                    2
                );
        }


        return Math.sqrt(
            sum /
            values.length
        );
    }


    weightedScore(
        values
    ) {

        let total = 0;

        let weight = 0;


        for (
            const item of values
        ) {

            const value =
                this.clamp(
                    Number(
                        item[0]
                    ),
                    0,
                    1
                );


            const itemWeight =
                Math.max(
                    0,
                    Number(
                        item[1]
                    )
                );


            total +=
                value *
                itemWeight;


            weight +=
                itemWeight;
        }


        return weight > 0

            ? this.clamp(
                total /
                weight,
                0,
                1
            )

            : 0;
    }


    normalizeRange(
        value,
        min,
        max
    ) {

        if (
            max <= min
        ) {

            return 0;
        }


        return this.clamp(
            (
                value -
                min
            ) /
            (
                max -
                min
            ),
            0,
            1
        );
    }


    toDb(
        value
    ) {

        return 20 *
            Math.log10(
                Math.max(
                    Math.abs(
                        value
                    ),
                    1e-12
                )
            );
    }


    removeMean(
        signal
    ) {

        const output =
            new Float32Array(
                signal.length
            );


        let mean = 0;


        for (
            let i = 0;
            i < signal.length;
            i++
        ) {

            mean +=
                signal[i];
        }


        mean /=
            Math.max(
                1,
                signal.length
            );


        for (
            let i = 0;
            i < signal.length;
            i++
        ) {

            output[i] =
                signal[i] -
                mean;
        }


        return output;
    }


    clamp(
        value,
        min,
        max
    ) {

        const numeric =
            Number(
                value
            );


        if (
            !Number.isFinite(
                numeric
            )
        ) {

            return min;
        }


        return Math.min(
            max,
            Math.max(
                min,
                numeric
            )
        );
    }


    getLastProfile() {

        return this.profile;
    }
}


window.VocalAnalyzer =
    VocalAnalyzer;