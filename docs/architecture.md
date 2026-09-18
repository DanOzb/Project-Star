# Architecture
 
**What this file is:** the shape of the system — what talks to what, and the
rules that have to hold. Describes how things are, not how they came to be.
 
---
 
## The mental model
 
Three layers.
 
**The document is TSX on disk.** Every edit ends as a change to a`.tsx` file.
 
**The renderer is Chromium.** Preview of design is always the real app. 
 
**The LLM is the last resort** The model is only needed for structural change. 
 
---
 
## Layout
 
```
apps/
  desktop/       
  daemon/        
  studio/        
packages/
  contracts/     
  locator/       
  edit-engine/   
  runtime/       
  design/        
  eval/          
templates/
  vite-spa/      
```
 
---
