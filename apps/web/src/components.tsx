import { Component,type ReactNode,type ButtonHTMLAttributes,type InputHTMLAttributes } from 'react';
export function Button(props:ButtonHTMLAttributes<HTMLButtonElement>){return <button {...props} className={`button ${props.className??''}`}/>;}
export function Input({label,id,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;id:string}){return <label className="field" htmlFor={id}><span>{label}</span><input {...props} id={id}/></label>;}
export function Card({children}: {children:ReactNode}){return <section className="card">{children}</section>;}
export function Status({children,error=false}:{children:ReactNode;error?:boolean}){return <p className={error?'status error':'status'} role={error?'alert':'status'}>{children}</p>;}
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<main className="container"><h1>Something went wrong.</h1><p>Please reload the page to try again.</p><a href="/">Return home</a></main>:this.props.children;}}
