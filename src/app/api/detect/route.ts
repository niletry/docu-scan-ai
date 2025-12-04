import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: Request) {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "DASHSCOPE_API_KEY not configured" }, { status: 500 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("image") as File;

        if (!file) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // Convert file to base64 Data URL (Web API compatible)
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        const mimeType = file.type || "image/jpeg";
        const dataUrl = `data:${mimeType};base64,${base64}`;

        const prompt = `
        You are a precise document scanner AI.
        
        TASK: Find the OUTERMOST 4 corners of the paper document.
        
        CRITICAL INSTRUCTIONS:
        1. Identify the physical edges where the paper meets the background.
        2. ENSURE THE ENTIRE PAPER IS INCLUDED. Do not crop inside the paper.
        3. Coordinates MUST be on a 0-1000 scale (normalized). [x, y] where x is horizontal (0-1000), y is vertical (0-1000).
        
        OUTPUT JSON:
        {
            "top_left": [x, y],
            "top_right": [x, y],
            "bottom_right": [x, y],
            "bottom_left": [x, y]
        }
        `;

        console.log("Calling DashScope (qwen3-vl-plus)...");

        const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "qwen3-vl-plus",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "image_url", image_url: { url: dataUrl } },
                            { type: "text", text: prompt }
                        ]
                    }
                ],
                stream: false,
                temperature: 0.01, // Low temperature for deterministic coordinates
                top_p: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("DashScope Error:", response.status, errorText);
            return NextResponse.json({ error: "DashScope API Error", details: errorText }, { status: response.status });
        }

        const result = await response.json();

        const content = result.choices?.[0]?.message?.content;
        if (!content) {
            return NextResponse.json({ error: "Empty response from model" }, { status: 500 });
        }

        // Extract JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: "No JSON found", raw: content });
        }

        const data = JSON.parse(jsonMatch[0]);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Handler Error:", error);
        return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
    }
}
