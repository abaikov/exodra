import { describe, expect, it } from 'vitest';
import { h, type TExoContext } from '@exodra/core';
import { ExoNodeString } from '@exodra/string';
import { bindable, list } from '@exodra/reactivity';

describe('Proper Attribute Tests', () => {
    it('passes constants through component context correctly', () => {
        // Component receives context with getConstant method
        function Card(ctx: TExoContext) {
            const title = ctx.getConstant<string>('title');
            const content = ctx.getConstant<string>('content');
            
            return h('div', { 
                static: {
                    class: 'card',
                    children: [
                        h('h3', { static: { children: title || 'No title' } }),
                        h('p', { static: { children: content || 'No content' } })
                    ]
                }
            });
        }
        
        // Create component with constants in buckets
        const schema = h(Card, {
            static: {
                title: 'Test Card',
                content: 'Test Content'
            }
        });
        
        const node = new ExoNodeString(schema);
        
        expect(node.html).toBe(
            '<div class="card"><h3>Test Card</h3><p>Test Content</p></div>'
        );
    });
    
    it('passes bindables and resolves their values', () => {
        const counter = bindable(42);
        const message = bindable('Hello');
        
        function Display(ctx: TExoContext) {
            // Get bindables from context
            const counterBinding = ctx.getBindable<typeof counter>('counter');
            const messageBinding = ctx.getBindable<typeof message>('message');
            
            // For SSR, we need to get values
            const count = counterBinding?.getValue() || 0;
            const msg = messageBinding?.getValue() || '';
            
            return h('div', {
                static: {
                    children: [
                        h('p', { static: { children: `Count: ${count}` } }),
                        h('p', { static: { children: `Message: ${msg}` } })
                    ]
                }
            });
        }
        
        const schema = h(Display, { bindables: { counter, message } });
        const node = new ExoNodeString(schema);
        
        expect(node.html).toContain('Count: 42');
        expect(node.html).toContain('Message: Hello');
        
        // Update values and re-render
        counter.setValue(100);
        message.setValue('Updated');
        
        const schema2 = h(Display, { bindables: { counter, message } });
        const node2 = new ExoNodeString(schema2);
        
        expect(node2.html).toContain('Count: 100');
        expect(node2.html).toContain('Message: Updated');
    });
    
    it('passes bindable lists through context', () => {
        const items = list(['Apple', 'Banana', 'Cherry']);
        
        function ItemList(ctx: TExoContext) {
            const itemsBinding = ctx.getBindableList<typeof items>('items');
            const itemsArray = itemsBinding?.snapshot() || [];
            
            return h('ul', {
                static: {
                    children: itemsArray.map((item, i) => 
                        h('li', { static: { key: i, children: item } })
                    )
                }
            });
        }
        
        const schema = h(ItemList, { bindableLists: { items } });
        const node = new ExoNodeString(schema);
        
        expect(node.html).toBe(
            '<ul><li key="0">Apple</li><li key="1">Banana</li><li key="2">Cherry</li></ul>'
        );
        
        // Modify list and re-render
        items.push('Date');
        items.remove(0); // Remove Apple
        
        const schema2 = h(ItemList, { bindableLists: { items } });
        const node2 = new ExoNodeString(schema2);
        
        expect(node2.html).toBe(
            '<ul><li key="0">Banana</li><li key="1">Cherry</li><li key="2">Date</li></ul>'
        );
    });
    
    it('nested components pass attributes correctly', () => {
        const globalTheme = bindable('dark');
        
        function Button(ctx: TExoContext) {
            const text = ctx.getConstant<string>('text') || 'Click';
            const themeBinding = ctx.getBindable<typeof globalTheme>('theme');
            const theme = themeBinding?.getValue() || 'light';
            
            return h('button', { static: { class: `btn-${theme}`, children: text } });
        }
        
        function Card(ctx: TExoContext) {
            const title = ctx.getConstant<string>('title') || 'Card';
            const themeBinding = ctx.getBindable<typeof globalTheme>('theme');
            
            // Pass theme down to Button
            return h('div', { 
                static: {
                    class: 'card',
                    children: [
                        h('h2', { static: { children: title } }),
                        h(Button, { 
                            static: { text: 'Action' },
                            bindables: { theme: themeBinding }
                        })
                    ]
                }
            });
        }
        
        function App(ctx: TExoContext) {
            const theme = ctx.getBindable<typeof globalTheme>('theme');
            
            return h('div', { 
                static: {
                    class: 'app',
                    children: [
                        h(Card, { 
                            static: { title: 'Card 1' },
                            bindables: { theme }
                        }),
                        h(Card, { 
                            static: { title: 'Card 2' },
                            bindables: { theme }
                        })
                    ]
                }
            });
        }
        
        const schema = h(App, { bindables: { theme: globalTheme } });
        const node = new ExoNodeString(schema);
        
        // Both buttons should have dark theme
        expect(node.html.match(/btn-dark/g)?.length).toBe(2);
        expect(node.html).toContain('<h2>Card 1</h2>');
        expect(node.html).toContain('<h2>Card 2</h2>');
        
        // Change theme
        globalTheme.setValue('light');
        const schema2 = h(App, { bindables: { theme: globalTheme } });
        const node2 = new ExoNodeString(schema2);
        
        // Both buttons should have light theme
        expect(node2.html.match(/btn-light/g)?.length).toBe(2);
        expect(node2.html).not.toContain('btn-dark');
    });
    
    it('handles mixed attribute types in one component', () => {
        const count = bindable(5);
        const tags = list(['react', 'vue', 'angular']);
        
        function Article(ctx: TExoContext) {
            // Constants
            const title = ctx.getConstant<string>('title') || 'Untitled';
            const author = ctx.getConstant<string>('author') || 'Anonymous';
            
            // Bindable
            const viewCount = ctx.getBindable<typeof count>('views');
            const views = viewCount?.getValue() || 0;
            
            // Bindable list
            const tagList = ctx.getBindableList<typeof tags>('tags');
            const allTags = tagList?.snapshot() || [];
            
            return h('article', {
                static: {
                    children: [
                        h('h1', { static: { children: title } }),
                        h('p', { static: { class: 'meta', children: `By ${author} • ${views} views` } }),
                        h('div', { 
                            static: {
                                class: 'tags',
                                children: allTags.map(tag => h('span', { static: { class: 'tag', children: tag } }))
                            }
                        })
                    ]
                }
            });
        }
        
        const schema = h(Article, {
            static: {
                title: 'Test Article',
                author: 'John Doe'
            },
            bindables: {
                views: count
            },
            bindableLists: {
                tags: tags
            }
        });
        
        const node = new ExoNodeString(schema);
        
        expect(node.html).toContain('<h1>Test Article</h1>');
        expect(node.html).toContain('By John Doe • 5 views');
        expect(node.html).toContain('<span class="tag">react</span>');
        expect(node.html).toContain('<span class="tag">vue</span>');
        expect(node.html).toContain('<span class="tag">angular</span>');
    });
    
    it('deeply nested component tree with attribute flow', () => {
        const user = bindable({ name: 'Alice', role: 'Admin' });
        const notifications = list([
            { id: 1, text: 'Welcome!', read: false },
            { id: 2, text: 'New message', read: true }
        ]);
        
        function Notification(ctx: TExoContext) {
            const notification = ctx.getConstant<any>('data');
            return h('div', { 
                static: { 
                    class: notification.read ? 'read' : 'unread',
                    children: notification.text
                }
            });
        }
        
        function NotificationList(ctx: TExoContext) {
            const items = ctx.getBindableList<typeof notifications>('items');
            const allItems = items?.snapshot() || [];
            
            return h('div', { 
                static: {
                    class: 'notifications',
                    children: allItems.map(item => 
                        h(Notification, { static: { data: item } })
                    )
                }
            });
        }
        
        function UserInfo(ctx: TExoContext) {
            const userBinding = ctx.getBindable<typeof user>('user');
            const userData = userBinding?.getValue();
            
            return h('div', { 
                static: {
                    class: 'user-info',
                    children: [
                        h('span', { static: { children: userData?.name || 'Guest' } }),
                        h('span', { static: { class: 'role', children: userData?.role || 'User' } })
                    ]
                }
            });
        }
        
        function Header(ctx: TExoContext) {
            const userBinding = ctx.getBindable<typeof user>('user');
            const notifs = ctx.getBindableList<typeof notifications>('notifications');
            
            return h('header', {
                static: {
                    children: [
                        h(UserInfo, { bindables: { user: userBinding } }),
                        h(NotificationList, { bindableLists: { items: notifs } })
                    ]
                }
            });
        }
        
        function App(ctx: TExoContext) {
            return h('div', { 
                static: {
                    class: 'app',
                    children: [
                        h(Header, { 
                            bindables: {
                                user: ctx.getBindable('user')
                            },
                            bindableLists: {
                                notifications: ctx.getBindableList('notifications')
                            }
                        })
                    ]
                }
            });
        }
        
        const schema = h(App, { 
            bindables: { user },
            bindableLists: { notifications }
        });
        const node = new ExoNodeString(schema);
        
        expect(node.html).toContain('Alice');
        expect(node.html).toContain('Admin');
        expect(node.html).toContain('Welcome!');
        expect(node.html).toContain('class="unread"');
        expect(node.html).toContain('class="read"');
        
        // Update state
        user.setValue({ name: 'Bob', role: 'User' });
        notifications.push({ id: 3, text: 'Third notification', read: false });
        
        const schema2 = h(App, { 
            bindables: { user },
            bindableLists: { notifications }
        });
        const node2 = new ExoNodeString(schema2);
        
        expect(node2.html).toContain('Bob');
        expect(node2.html).toContain('User');
        expect(node2.html).toContain('Third notification');
    });
});