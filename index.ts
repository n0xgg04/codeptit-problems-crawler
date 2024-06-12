import axios from "axios"
import * as cheerio from 'cheerio';
import fs from 'fs'

const headers = {
    "Referer": "https://code.ptit.edu.vn/student/question",
    "Sec-Ch-Ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"\n",
    "Cookie": "_ga=GA1.3.53424761.1696861074; _ga_WF3VN29N2R=GS1.3.1704200497.3.0.1704200497.0.0.0; remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d=eyJpdiI6IkdMZDlPMTlZK3dCRWlOemhDckQxbkE9PSIsInZhbHVlIjoidlZ4NDB0WmV0RDFVVm5kZHIyZmcwNWcrcmY2TjlNZ1Y2dXhQSjFoQWNkcHhCTTk4dGw3Z1F1VHBnWTJ5NkpQcUNTKzN2WXlza1lnajRuUkJtcTJRRGQzRXFvTlAzK0Qxd3N6UlZEaTNUaHZyQ1orYnhyK05aeThYZHZ1dEd5UVNLQittM2tTMlF1VXJKR1JMNUlOS3pwcHY2L1RxajBaUzBRdzUyVUJpc2swRGovNThQL2hJRlIzb2NVdDBkUTJDbm43b1F0Z1hwWGpNbVFqU08waHF6MjdZdHJXVEljK3lmL1k4KytqeXJqYz0iLCJtYWMiOiI0YWFjMjEwNWZjMDM0ODM2NDI3MmE4MDU1ZmZiMDc1ZDgxODlhNjgxMGI4MjFkYTM5NzFjMzEwZmM3YjU0MmY1IiwidGFnIjoiIn0%3D; XSRF-TOKEN=eyJpdiI6InhPYTdOSlRJcitnRmRmenllNEtqZlE9PSIsInZhbHVlIjoiakNHeTl3Z0xyR2JoL1BmMDJMbGpZZ1dBYnVjR0Q4eWxpUHVyaVpSeEQyVVRmQStob0lWV3NTL3lSMzRISW9BYkpWQUlLaGVISG9KUU1CdzZORGEzdWZVdjFRZHZJalkraEFRd2NaRnJrTStjQkhyTC9RR1JSemljQ3ZITS9ZMmMiLCJtYWMiOiI4NDE1YzMxNzJmNGNhNDg4MDA0NjkyNDgzYzA2YzA3NjdiYTc3OTIzM2MwZjZmZmRlYTEzZWU1MTQ4NDY2MDM1IiwidGFnIjoiIn0%3D; ptit_code_session=eyJpdiI6IkNHZGRIN1hQTGRRZk5Bclo4VmFWUnc9PSIsInZhbHVlIjoianlJMDRqRzVUZlBJbS9qK2VUMmZqRFo0ZWJrN3lrNkYwcnpnYVJITnJMSkNhMjRMWGNIUFlTbTFxVFZQbDcvdUlMWlpiZDNDRldQVjljcnM0M3puakZManNPM3pQM25CWllvOUkwdk0yZk5uN0UxMGRMaHZxeTBOZEZkU1ZuRWYiLCJtYWMiOiI2NjUxYzY4MmNkNTg0MzIxMjUzZmQ2ZWQ3YzM5OTgxN2Y4Nzg2MWZmODI4OGRhOTcxZTc0NTA1ODQyMzIxNzg2IiwidGFnIjoiIn0%3D",
    "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
}

const delay = (delayTime: number): Promise<void> =>{
    return new Promise((res, rej) => {
        setTimeout(() => res(), delayTime)
    })
}

type Promises = {
    promise: () => Promise<any>,
    id: string;
    name: string;
}

const promises: Promises[] = []

type OutputType = {
   id: string;
   name: string;
   content?: string | null;
}[]

(async() => {
    try {
        const output: OutputType = []
        let all: Promises[] = []
        for(let i=1;i<=3;i++) {
            const html = await axios.get("https://code.ptit.edu.vn/student/question?page="+i, {
                headers
            })
            const $ = cheerio.load(html.data);
            const table = $('.status .ques__table__wrapper table.ques__table tbody')
            all.push(...table.find("tr").map((i, el) => {
                const element = $(el);
                let problemName = element.find("td:nth-child(4)").text();
                const problemLink = element.find("td:nth-child(4) a").attr("href");
                let problemID = element.find("td:nth-child(3)").text();
                problemID = problemID.replace(/^\s+|\s+$/g, "");
                const problemTopic = element.find("td:nth-child(6)").text();
                const problemDifficulty = element.find("td:nth-child(7)").text();
                problemName = problemName.replace(/^\s+|\s+$/g, "");
                console.log("Getting " + problemID + " " + problemName + " ...")
                return {
                    promise: async () => await axios.get('https://code.ptit.edu.vn/student/question/' + problemID, {
                        headers
                    }), id: problemID, name: problemName
                }
            }).toArray())
        }

            let done = 1;
            for await(let pro of all) {
                const exists = fs.existsSync("./data/"+pro.id+"_"+pro.name+".json")
                if(exists) continue;
                console.log(`[${done++}/${all.length}] Saving ${pro.name} ... `)
                const data = await pro.promise();
                const $$ = cheerio.load(data.data)
                const content = $$('.container-fluid .wrapper .main--fluid .submit__des').html()
                const dat = {
                    id: pro.id, name: pro.name, content
                }
                fs.writeFileSync("./data/"+pro.id+"_"+pro.name+".json", JSON.stringify(dat))
                await delay(2000)
            }

    }catch (e) {
        console.log(e)
    }


})()

