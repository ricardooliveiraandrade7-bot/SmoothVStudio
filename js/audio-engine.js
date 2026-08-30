"use strict";


class AudioEngine {
    
    constructor() {
        
        this.audioContext =
            null;
        
        this.originalBuffer =
            null;
        
        this.processedBuffer =
            null;
        
        this.sampleRate =
            44100;
            
        this.analyzer =
    new VocalAnalyzer();

this.vocalProfile =
    null;
    }
    
    
    createContext() {
        
        if (
            this.audioContext
        ) {
            
            return this.audioContext;
        }
        
        
        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;
        
        
        if (
            !AudioContextClass
        ) {
            
            throw new Error(
                "Web Audio API não disponível."
            );
        }
        
        
        this.audioContext =
            new AudioContextClass();
        
        
        return this.audioContext;
    }
    
    
    async resumeContext() {
        
        const context =
            this.createContext();
        
        
        if (
            context.state ===
            "suspended"
        ) {
            
            await context.resume();
        }
        
        
        return context;
    }
    
    
    async decodeFile(
        file
    ) {
        
        if (
            !file
        ) {
            
            throw new Error(
                "Nenhum arquivo foi selecionado."
            );
        }
        
        
        const context =
            await this.resumeContext();
        
        
        const arrayBuffer =
            await file.arrayBuffer();
        
        
        if (
            !arrayBuffer ||
            arrayBuffer.byteLength === 0
        ) {
            
            throw new Error(
                "O arquivo de áudio está vazio."
            );
        }
        
        
        const audioBuffer =
            await context.decodeAudioData(
                arrayBuffer
            );
        
        
        if (
            !audioBuffer
        ) {
            
            throw new Error(
                "Não foi possível decodificar o áudio."
            );
        }
        
        
        this.originalBuffer =
            audioBuffer;
        
        this.processedBuffer =
            null;
        
        this.sampleRate =
            audioBuffer.sampleRate;
        
        this.vocalProfile =
    null;
    
    
        return audioBuffer;
    }
        getOriginalBuffer() {

        return this.originalBuffer;
    }


getVocalProfile() {
    
    return this.vocalProfile;
}


    getProcessedBuffer() {

        return this.processedBuffer;
    }


    async process() {

        if (
            !this.originalBuffer
        ) {

            throw new Error(
                "Nenhum áudio carregado."
            );
        }


this.vocalProfile =
    this.analyzer.analyze(
        this.originalBuffer
    );
    

        const processed =
            this.cloneAudioBuffer(
                this.originalBuffer
            );


        this.processedBuffer =
            processed;


        return processed;
    }


    cloneAudioBuffer(
        source
    ) {

        if (
            !source
        ) {

            throw new Error(
                "Buffer de áudio inválido."
            );
        }


        const context =
            this.createContext();


        const clone =
            context.createBuffer(
                source.numberOfChannels,
                source.length,
                source.sampleRate
            );


        for (
            let channel = 0;
            channel <
            source.numberOfChannels;
            channel++
        ) {

            const sourceData =
                source.getChannelData(
                    channel
                );


            const targetData =
                clone.getChannelData(
                    channel
                );


            targetData.set(
                sourceData
            );
        }


        return clone;
    }


    hasOriginal() {

        return Boolean(
            this.originalBuffer
        );
    }


    hasProcessed() {

        return Boolean(
            this.processedBuffer
        );
    }
        clearProcessed() {

        this.processedBuffer =
            null;
    }


    clearOriginal() {

        this.originalBuffer =
            null;

        this.vocalProfile =
    null;
    }


    reset() {

        this.originalBuffer =
            null;

        this.processedBuffer =
            null;
            
            this.vocalProfile =
    null;

        this.sampleRate =
            44100;
    }


    getSampleRate() {

        if (
            this.originalBuffer
        ) {

            return (
                this.originalBuffer.sampleRate
            );
        }


        return this.sampleRate;
    }


    getNumberOfChannels() {

        if (
            !this.originalBuffer
        ) {

            return 0;
        }


        return (
            this.originalBuffer.numberOfChannels
        );
    }


    getLength() {

        if (
            !this.originalBuffer
        ) {

            return 0;
        }


        return (
            this.originalBuffer.length
        );
    }


    getDuration() {

        if (
            !this.originalBuffer
        ) {

            return 0;
        }


        return (
            this.originalBuffer.duration
        );
    }


    getAudioInfo() {

        if (
            !this.originalBuffer
        ) {

            return null;
        }


        return {

            sampleRate:
                this.originalBuffer.sampleRate,

            numberOfChannels:
                this.originalBuffer.numberOfChannels,

            length:
                this.originalBuffer.length,

            duration:
                this.originalBuffer.duration
        };
    }
        validateBuffer(
        buffer
    ) {
        
        if (
            !buffer
        ) {
            
            return false;
        }
        
        
        if (
            typeof buffer.numberOfChannels !==
            "number"
        ) {
            
            return false;
        }
        
        
        if (
            typeof buffer.length !==
            "number"
        ) {
            
            return false;
        }
        
        
        if (
            typeof buffer.sampleRate !==
            "number"
        ) {
            
            return false;
        }
        
        
        if (
            buffer.numberOfChannels <= 0
        ) {
            
            return false;
        }
        
        
        if (
            buffer.length <= 0
        ) {
            
            return false;
        }
        
        
        if (
            buffer.sampleRate <= 0
        ) {
            
            return false;
        }
        
        
        return true;
    }
    
    
    validateOriginal() {
        
        return this.validateBuffer(
            this.originalBuffer
        );
    }
    
    
    validateProcessed() {
        
        return this.validateBuffer(
            this.processedBuffer
        );
    }
    
    
    hasSameStructure(
        original,
        processed
    ) {
        
        if (
            !this.validateBuffer(
                original
            )
        ) {
            
            return false;
        }
        
        
        if (
            !this.validateBuffer(
                processed
            )
        ) {
            
            return false;
        }
        
        
        return (
            
            original.sampleRate ===
            processed.sampleRate
            
            &&
            
            original.numberOfChannels ===
            processed.numberOfChannels
            
            &&
            
            original.length ===
            processed.length
        );
    }
        setProcessedBuffer(
        buffer
    ) {

        if (
            !this.validateBuffer(
                buffer
            )
        ) {

            throw new Error(
                "Buffer processado inválido."
            );
        }


        this.processedBuffer =
            buffer;


        return this.processedBuffer;
    }


    getOutputBuffer() {

        if (
            !this.processedBuffer
        ) {

            return null;
        }


        return this.processedBuffer;
    }


    isReady() {

        return (
            this.validateOriginal()
        );
    }


    isReadyForExport() {

        return (
            this.validateProcessed()
        );
    }


    getState() {

        return {

            hasOriginal:
                this.hasOriginal(),

            hasProcessed:
                this.hasProcessed(),

            sampleRate:
                this.getSampleRate(),

            numberOfChannels:
                this.getNumberOfChannels(),

            length:
                this.getLength(),

            duration:
                this.getDuration()
        };
    }
}


window.AudioEngine =
    AudioEngine;