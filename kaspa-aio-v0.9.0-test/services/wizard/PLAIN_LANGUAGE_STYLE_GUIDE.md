# Plain Language Style Guide
## Kaspa All-in-One Installation Wizard

### Purpose

This guide ensures all wizard content is accessible to non-technical users while maintaining accuracy. Our goal is a 90% installation success rate for users of all technical levels.

### Core Principles

1. **Write for 8th grade reading level** (13-14 years old)
2. **Use friendly, conversational tone** - like talking to a friend
3. **Explain technical terms** - never assume knowledge
4. **Focus on benefits** - what users get, not how it works
5. **Be encouraging** - build confidence, reduce anxiety

### Reading Level Guidelines

**DO:**
- Use short sentences (15-20 words max)
- Use common words everyone knows
- Break complex ideas into simple steps
- Use active voice ("We'll install..." not "Installation will be performed...")
- Use "you" and "your" to speak directly to users

**DON'T:**
- Use jargon without explanation
- Use passive voice
- Write long paragraphs (3-4 sentences max)
- Assume technical knowledge
- Use abbreviations without defining them first

### Tone Guidelines

**Friendly & Encouraging:**
- ✅ "Great! Your system is ready to go."
- ❌ "System requirements validated successfully."

**Conversational:**
- ✅ "Let's check if your computer has what it needs."
- ❌ "Initiating system requirements verification."

**Supportive:**
- ✅ "Don't worry - we'll help you fix this."
- ❌ "Error: Configuration invalid."

**Clear & Direct:**
- ✅ "You need 8 GB of memory to run this."
- ❌ "Minimum RAM requirement: 8 GB."

### Content Structure

#### Profile Descriptions

Every profile description should have three sections:

1. **What You Get** (1-2 sentences)
   - Plain language description of what this does
   - Focus on user benefits

2. **What This Means** (2-3 sentences)
   - Explain in simple terms
   - Use analogies when helpful
   - Connect to real-world use cases

3. **What You Need** (bullet list)
   - System requirements in plain language
   - Time estimates
   - Disk space in relatable terms

**Example:**

```markdown
### Core Node

**What You Get:**
Your own piece of the Kaspa network that helps keep the blockchain running.

**What This Means:**
Think of it like running your own mini bank branch. You'll have a complete copy of all Kaspa transactions, and you'll help verify new ones. This means you don't have to trust anyone else - you can check everything yourself.

**What You Need:**
- A computer with 8 GB of memory (like a modern laptop)
- 100 GB of free space (about 25,000 photos worth)
- About 2 hours for the first setup
- A stable internet connection
```

#### Error Messages

Every error message should have three parts:

1. **What This Means** (1 sentence)
   - Explain the problem in simple terms

2. **Why This Happened** (1-2 sentences)
   - Give the likely cause
   - No blame, just facts

3. **How to Fix** (numbered steps)
   - Clear, actionable steps
   - Include links to help if needed

**Example:**

```markdown
### Not Enough Memory

**What This Means:**
Your computer doesn't have enough memory (RAM) to run this safely.

**Why This Happened:**
The Kaspa node needs 8 GB of memory to work properly, but your computer has 4 GB. Running it anyway could make your computer slow or crash.

**How to Fix:**
1. Choose "Use Remote Node" instead - this needs much less memory
2. Or upgrade your computer's memory to 8 GB or more
3. Need help? [Check our hardware guide](#)
```

#### Progress Descriptions

Every installation step should explain:

1. **What's Happening Now** (1 sentence)
   - Current action in plain language

2. **Why This Takes Time** (1 sentence, optional)
   - Only if the step is slow

3. **What's Next** (1 sentence, optional)
   - Only for long steps

**Example:**

```markdown
**Downloading Docker Images**

What's Happening Now:
We're downloading the software packages you need (like downloading apps on your phone).

Why This Takes Time:
These files are large - about 2 GB total. On a typical internet connection, this takes 5-10 minutes.

What's Next:
Once downloaded, we'll set everything up and start your services.
```

### Technical Terms Glossary

When you must use a technical term, always provide a tooltip or link to the glossary.

**Format:**
```html
<span class="term" data-tooltip="A copy of all Kaspa transactions">blockchain</span>
```

**Common Terms to Define:**

| Technical Term | Plain Language Definition |
|----------------|---------------------------|
| Node | A computer that helps run the Kaspa network |
| Blockchain | A shared record of all Kaspa transactions |
| Indexer | A tool that organizes blockchain data so you can search it |
| Docker | Software that runs programs in isolated containers |
| Container | A packaged program that runs the same way everywhere |
| Profile | A pre-configured set of services |
| RAM/Memory | Your computer's short-term memory for running programs |
| Disk Space | Storage space on your hard drive |
| CPU/Processor | Your computer's brain that does the calculations |
| Port | A numbered doorway for network connections |
| Sync | Downloading and verifying all blockchain data |
| RPC | A way for programs to talk to the node |
| P2P | Peer-to-peer - computers talking directly to each other |
| Database | Organized storage for large amounts of data |
| API | A way for programs to request data |

### Word Choice Guidelines

**Use Simple Alternatives:**

| Instead of... | Say... |
|---------------|--------|
| Execute | Run |
| Terminate | Stop |
| Initialize | Start / Set up |
| Configure | Set up / Customize |
| Deploy | Install / Start |
| Validate | Check |
| Authenticate | Log in / Verify |
| Repository | Storage / Collection |
| Dependency | Required program |
| Prerequisite | What you need first |
| Optimal | Best |
| Insufficient | Not enough |
| Allocate | Assign / Give |
| Utilize | Use |
| Commence | Start |
| Facilitate | Help / Make easier |

### Numbers and Measurements

**Make them relatable:**

| Technical | Plain Language |
|-----------|----------------|
| 8 GB RAM | 8 GB of memory (like a modern laptop) |
| 100 GB disk | 100 GB of space (about 25,000 photos) |
| 2 CPU cores | 2 processor cores (most computers have 4 or more) |
| 10 Mbps | 10 Mbps internet (typical home connection) |
| 2 hours | About 2 hours (time to watch a movie) |
| 500 GB | 500 GB (half a terabyte - a lot of space!) |

### Time Estimates

Always provide context:

- ✅ "About 5 minutes (time to make coffee)"
- ✅ "2-3 hours for first sync (we'll show progress)"
- ✅ "30 seconds (just a moment)"
- ❌ "300 seconds"
- ❌ "Approximately 2-3 hours"

### Warnings and Alerts

**Structure:**
1. Icon (⚠️ for warnings, ❌ for errors, ℹ️ for info)
2. Short headline
3. Brief explanation
4. What to do

**Example:**

```markdown
⚠️ **Low Memory Warning**

Your computer has 4 GB of memory, but this needs 8 GB.

Running anyway might make your computer slow or cause crashes.

**What to do:** Choose "Use Remote Node" instead (needs only 1 GB).
```

### Success Messages

Keep them encouraging and clear:

- ✅ "Perfect! Your system is ready."
- ✅ "All set! Installation complete."
- ✅ "Great choice! This will work well on your system."
- ❌ "System validation successful."
- ❌ "Installation completed without errors."

### Button and Link Text

Use action words that describe what happens:

- ✅ "Get Started"
- ✅ "Check My System"
- ✅ "Install Now"
- ✅ "Show Me How"
- ❌ "Proceed"
- ❌ "Continue"
- ❌ "Submit"

### Testing Your Content

Ask yourself:

1. **Would a 13-year-old understand this?**
2. **Does it sound like a helpful friend talking?**
3. **Are all technical terms explained?**
4. **Is it encouraging, not intimidating?**
5. **Does it tell users what to DO, not just what IS?**

If you answer "no" to any question, rewrite it.

### Examples: Before and After

#### Example 1: System Check

**Before:**
```
Validating system prerequisites...
Docker Engine: v24.0.6 detected
RAM: 16384 MB available
Disk: 512 GB free space
Status: All requirements met
```

**After:**
```
Checking if your computer is ready...

✓ Docker is installed (great!)
✓ You have 16 GB of memory (plenty!)
✓ You have 512 GB of free space (more than enough!)

Perfect! Your system is ready to go.
```

#### Example 2: Profile Description

**Before:**
```
Explorer Profile

Deploys blockchain indexing services with TimescaleDB for advanced analytics and data exploration. Includes K-indexer and Simply-Kaspa indexer with optimized hypertables and compression policies.

Requirements: 8 GB RAM, 200 GB SSD, 4 CPU cores
```

**After:**
```
Explorer Profile

**What You Get:**
Tools to search and analyze the entire Kaspa blockchain.

**What This Means:**
Like having a search engine for Kaspa. You can look up any transaction, see network statistics, and track addresses. Perfect if you're building apps or just curious about the blockchain.

**What You Need:**
- 8 GB of memory (modern laptop)
- 200 GB of space (SSD recommended for speed)
- 4 processor cores (most computers have this)
- About 3 hours for first setup
```

#### Example 3: Error Message

**Before:**
```
Error: EADDRINUSE
Port 16110 is already in use by another process.
Resolution: Terminate conflicting process or modify port configuration.
```

**After:**
```
❌ **Port Already in Use**

**What This Means:**
Another program is already using port 16110, which Kaspa needs.

**Why This Happened:**
You might have Kaspa already running, or another program is using this port.

**How to Fix:**
1. Check if Kaspa is already running and close it
2. Or restart your computer (this usually fixes it)
3. Still stuck? [Get help here](#)
```

### Accessibility Notes

- Use proper heading hierarchy (h1 → h2 → h3)
- Provide alt text for all images
- Ensure color contrast meets WCAG AA standards
- Make all interactive elements keyboard accessible
- Use ARIA labels for screen readers

### Review Checklist

Before publishing any content, verify:

- [ ] Reading level is 8th grade or below
- [ ] Tone is friendly and encouraging
- [ ] All technical terms are explained
- [ ] Sentences are short (15-20 words)
- [ ] Paragraphs are short (3-4 sentences)
- [ ] Active voice is used
- [ ] Numbers have context
- [ ] Actions are clear
- [ ] No jargon without explanation
- [ ] Would make sense to a non-technical user

---

**Remember:** Every word should help users succeed. If it doesn't help, cut it.
