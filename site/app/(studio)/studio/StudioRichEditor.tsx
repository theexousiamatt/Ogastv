'use client';

import React, { useEffect } from 'react';
import {
  $createParagraphNode, $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND,
  type LexicalEditor, type EditorState,
} from '@payloadcms/richtext-lexical/lexical';
import { LexicalComposer } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposer';
import { RichTextPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@payloadcms/richtext-lexical/lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalLinkPlugin';
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@payloadcms/richtext-lexical/lexical/rich-text';
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@payloadcms/richtext-lexical/lexical/list';
import { LinkNode, AutoLinkNode, TOGGLE_LINK_COMMAND } from '@payloadcms/richtext-lexical/lexical/link';
import { $setBlocksType } from '@payloadcms/richtext-lexical/lexical/selection';
import { Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, Pilcrow, Undo2, Redo2 } from 'lucide-react';
import { UNDO_COMMAND, REDO_COMMAND } from '@payloadcms/richtext-lexical/lexical';

type BodyState = {root: {type?: string;children?: unknown[]}} & Record<string, unknown>;

const knownNodes=new Set(['root','paragraph','text','linebreak','tab','heading','quote','list','listitem','link','autolink']);
export function canEditRichBody(input:unknown):boolean {
  if(!input || typeof input!=='object') return true;
  const inspect=(node:unknown):boolean=>{
    if(!node || typeof node!=='object') return false;
    const x=node as {type?:unknown;children?:unknown[];fields?:unknown;root?:unknown};
    if(x.root) return inspect(x.root);
    if(typeof x.type!=='string' || !knownNodes.has(x.type)) return false;
    // Payload links can carry custom fields. Preserve those documents until a
    // compatible link importer is available, rather than silently losing URLs.
    if((x.type==='link'||x.type==='autolink') && x.fields) return false;
    return !x.children || (Array.isArray(x.children)&&x.children.every(inspect));
  };
  return inspect(input);
}

type Props={
  value:BodyState|null;
  onChange:(body:BodyState,text:string)=>void;
  disabled?:boolean;
};

function Toolbar(){
  const [editor]=useLexicalComposerContext();
  const button=(label:string,Icon:React.ComponentType<{size?:number}>,run:()=>void)=>(
    <button type="button" key={label} title={label} aria-label={label}
      onMouseDown={e=>e.preventDefault()} onClick={run}><Icon size={17}/></button>
  );
  const blocks=(type:'paragraph'|'h2'|'h3'|'quote')=>{
    editor.update(()=>{
      const sel=$getSelection();
      if(!$isRangeSelection(sel)) return;
      $setBlocksType(sel,()=>{
        if(type==='paragraph') return $createParagraphNode();
        if(type==='quote') return $createQuoteNode();
        return $createHeadingNode(type);
      });
    });
  };
  const link=()=>{
    const address=window.prompt('Paste a website link (https://…)');
    if(address===null) return;
    if(!address.trim()) {editor.dispatchCommand(TOGGLE_LINK_COMMAND,null);return;}
    try{
      const url=new URL(address.trim());
      if(!['https:','http:'].includes(url.protocol)) throw new Error('URL protocol');
      editor.dispatchCommand(TOGGLE_LINK_COMMAND,url.toString());
    }catch{window.alert('Please use a valid http or https link.');}
  };
  return <div className="ogas-rich-toolbar" role="toolbar" aria-label="Article formatting">
    {button('Normal text',Pilcrow,()=>blocks('paragraph'))}
    {button('Heading',Heading2,()=>blocks('h2'))}
    {button('Small heading',Heading3,()=>blocks('h3'))}
    <span className="ogas-rich-divider"/>
    {button('Bold',Bold,()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'bold'))}
    {button('Italic',Italic,()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'italic'))}
    {button('Underline',Underline,()=>editor.dispatchCommand(FORMAT_TEXT_COMMAND,'underline'))}
    {button('Add link',LinkIcon,link)}
    <span className="ogas-rich-divider"/>
    {button('Bulleted list',List,()=>editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND,undefined))}
    {button('Numbered list',ListOrdered,()=>editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND,undefined))}
    {button('Quote',Quote,()=>blocks('quote'))}
    <span className="ogas-rich-divider"/>
    {button('Undo',Undo2,()=>editor.dispatchCommand(UNDO_COMMAND,undefined))}
    {button('Redo',Redo2,()=>editor.dispatchCommand(REDO_COMMAND,undefined))}
  </div>;
}

function EditableState({disabled}: {disabled:boolean}){
  const [editor]=useLexicalComposerContext();
  useEffect(()=>editor.setEditable(!disabled),[editor,disabled]);
  return null;
}

function Changes({onChange}:{onChange:Props['onChange']}){
  return <OnChangePlugin onChange={(state:EditorState)=>{
    state.read(()=>{
      const serialized=state.toJSON() as BodyState;
      const plain=$getRoot().getTextContent();
      onChange(serialized,plain);
    });
  }} ignoreSelectionChange/>;
}

export function StudioRichEditor({value,onChange,disabled=false}:Props){
  const init={
    namespace:'ogas-studio-rich',
    nodes:[HeadingNode,QuoteNode,ListNode,ListItemNode,LinkNode,AutoLinkNode],
    onError:(error:Error)=>{console.error('OgasTV article editor:',error);},
    editorState:value&&Array.isArray(value.root?.children)&&value.root.children.length
      ? JSON.stringify(value):undefined,
    theme:{
      paragraph:'ogas-rich-paragraph',
      heading:{h2:'ogas-rich-h2',h3:'ogas-rich-h3'},
      quote:'ogas-rich-quote',
      list:{ul:'ogas-rich-ul',ol:'ogas-rich-ol',listitem:'ogas-rich-listitem'},
      text:{bold:'ogas-rich-bold',italic:'ogas-rich-italic',underline:'ogas-rich-underline'},
      link:'ogas-rich-link',
    },
  };
  return <div className="ogas-rich-editor">
    <LexicalComposer initialConfig={init}>
      <Toolbar/>
      <div className="ogas-rich-editable">
        <RichTextPlugin
          contentEditable={<ContentEditable className="ogas-rich-content" aria-label="Article body" />}
          placeholder={<div className="ogas-rich-placeholder">Write your article here…</div>}
          ErrorBoundary={({children}:{children?:React.ReactNode})=><>{children}</>}
        />
      </div>
      <HistoryPlugin/>
      <ListPlugin/>
      <LinkPlugin/>
      <EditableState disabled={disabled}/>
      <Changes onChange={onChange}/>
    </LexicalComposer>
  </div>;
}
