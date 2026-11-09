import fs from 'fs'

let DYUserVAICs_filename = fs.readdirSync('./').find(a => a.includes(`DYUser VAICs - `) && a.includes('.json'))
let DYUserVAICs = JSON.parse(fs.readFileSync(DYUserVAICs_filename).toString())

let Exists = [], Exists_Complete = [], Exists_WithIssue = [], Absent = []

DYUserVAICs.map(a => {
    let id = a.aweme_id

    let json_exists = fs.existsSync(`Transcriptions/${id}/T.json`)
    if (json_exists) {
        Exists.push(id)
        if(fs.readFileSync(`Transcriptions/${id}/T.txt`).length > 10) Exists_Complete.push(id)
        else Exists_WithIssue.push(id)
    } else {
        Absent.push(id)
    }
})


fs.writeFileSync(`Exists`, Exists.join('\n'))
fs.writeFileSync(`Exists_Complete`, Exists_Complete.join('\n'))
fs.writeFileSync(`Exists_WithIssue`, Exists_WithIssue.join('\n'))
fs.writeFileSync(`Absent`, Absent.join('\n'))