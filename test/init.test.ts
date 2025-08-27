import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

const configPath = path.resolve('monorepo-merge-config.json')

describe('init command', () => {
    beforeEach(() => {
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath)
    })

    afterEach(() => {
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath)
    })

    it('should create monorepo-merge-config.json', async () => {
        await import('../index.js').then(cli => cli.init())
        expect(fs.existsSync(configPath)).toBe(true)
    })

    it('should not overwrite existing config file', async () => {
        fs.writeFileSync(configPath, '{"test":true}')

        // Intercetta l'output della console
        let output = '';
        const originalLog = console.log;
        console.log = (msg) => { output += msg; };

        // Intercetta process.exit
        const originalExit = process.exit;
        let exitCalled = false;
        process.exit = () => { exitCalled = true; throw new Error('exit'); };

        try {
            await import('../index.js').then(cli => cli.init())
        } catch (e) {
            // Ignora l'errore generato da process.exit
        }

        // Ripristina console.log e process.exit
        console.log = originalLog;
        process.exit = originalExit;

        const content = fs.readFileSync(configPath, 'utf-8');
        expect(content).toBe('{"test":true}');
        expect(output).toContain('The file monorepo-merge-config.json already exists');
        expect(exitCalled).toBe(true);
    })

    it('should create a valid JSON config file', async () => {
        await import('../index.js').then(cli => cli.init())
        const content = fs.readFileSync(configPath, 'utf-8')
        expect(() => JSON.parse(content)).not.toThrow()
        expect(typeof JSON.parse(content)).toBe('object')
    })
})