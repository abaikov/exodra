import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { mountExoReactTree } from './helpers/mountExoReactTree';
import { clickExoReactElement } from './helpers/clickExoReactElement';
import { waitForExoReactCondition } from './helpers/waitForExoReactCondition';

describe('framer-motion', () => {
    it('mounts a motion.div with its initial style and animates to a new target', async () => {
        function Fader() {
            const [visible, setVisible] = useState(false);
            return (
                <div>
                    <motion.div
                        id="box"
                        initial={{ opacity: 0.5, x: 10 }}
                        animate={{ opacity: visible ? 1 : 0.5 }}
                        transition={{ duration: 0 }}
                    >
                        box
                    </motion.div>
                    <button onClick={() => setVisible(true)}>show</button>
                </div>
            );
        }

        const { container, unmount } = await mountExoReactTree(<Fader />);
        const box = container.querySelector('#box') as HTMLElement;
        expect(box.textContent).toBe('box');
        expect(box.style.opacity).toBe('0.5');
        expect(box.style.transform).toContain('translateX(10px)');

        await clickExoReactElement(container.querySelector('button'));
        await waitForExoReactCondition(() => box.style.opacity === '1');
        expect(container.querySelector('#box')).toBe(box);

        await unmount();
    });
});
